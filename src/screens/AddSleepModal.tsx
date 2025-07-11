import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Button,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useColours } from '../store/themeStore';
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import { SleepLog } from '../store/sleepStore';
import { useSleepStore } from '../store/sleepStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  defaultValues?: Partial<SleepLog>;
};

export default function AddSleepModal({
  visible,
  onClose,
  defaultValues = {},
}: Props) {
  const colours = useColours();
  /* ---------------------------------------------------------------------- */
  /*                               Form state                               */
  /* ---------------------------------------------------------------------- */
  const [start, setStart] = useState<Date>(
    defaultValues.start ? new Date(defaultValues.start) : new Date(),
  );
  const [end, setEnd] = useState<Date | undefined>(
    defaultValues.end ? new Date(defaultValues.end) : undefined,
  );
  const [qualityText, setQualityText] = useState<string>(
    defaultValues.quality !== undefined ? String(defaultValues.quality) : '',
  );
  const [tagsText, setTagsText] = useState<string>(
    defaultValues.tags?.join(', ') ?? '',
  );

  /* ---------------------------------------------------------------------- */
  /*                       Sync state when defaultValues change             */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    setStart(defaultValues.start ? new Date(defaultValues.start) : new Date());
    setEnd(defaultValues.end ? new Date(defaultValues.end) : undefined);
    setQualityText(
      defaultValues.quality !== undefined ? String(defaultValues.quality) : '',
    );
    setTagsText(defaultValues.tags?.join(', ') ?? '');
  }, [defaultValues.id, visible]);

  /* ---------------------------------------------------------------------- */
  /*                           DateTime pickers UI                          */
  /* ---------------------------------------------------------------------- */
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleStartPicked = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setShowStartPicker(false);
      return;
    }
    setShowStartPicker(false);
    if (date) setStart(date);
  };

  const handleEndPicked = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setShowEndPicker(false);
      return;
    }
    setShowEndPicker(false);
    if (date) setEnd(date);
  };

  /* ------------------------------ helpers ------------------------------- */
  const openTime = (
    base: Date,
    setFn: (d: Date) => void,
  ) =>
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      onChange: (_e, t) => {
        if (!t) return;
        setFn(
          new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            t.getHours(),
            t.getMinutes(),
          ),
        );
      },
    });

  /* ---------------------------------------------------------------------- */
  /*                               Save logic                               */
  /* ---------------------------------------------------------------------- */
  const save = async () => {
    if (!start) {
      return alert('Please select a start time');
    }
    if (end && end.getTime() <= start.getTime()) {
      return alert('End time must be after start time');
    }

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let qualityNum: number | undefined;
    if (qualityText.trim() === '') {
      qualityNum = undefined;
    } else {
      qualityNum = Number(qualityText);
      if (isNaN(qualityNum) || qualityNum < 1 || qualityNum > 10) {
        return alert('Quality must be a number between 1 and 10');
      }
    }

    if (defaultValues.id) {
      await useSleepStore.getState().update(defaultValues.id, {
        start: start.toISOString(),
        end: end ? end.toISOString() : undefined,
        quality: qualityNum,
        tags,
      });
    } else {
      await useSleepStore.getState().add({
        start: start.toISOString(),
        end: end ? end.toISOString() : undefined,
        quality: qualityNum,
        tags,
      });
    }

    onClose();
  };

  /* ---------------------------------------------------------------------- */
  /*                                  JSX                                   */
  /* ---------------------------------------------------------------------- */
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colours.background }]}>
        <Text style={[styles.title, { color: colours.text }]}>Add Sleep Log</Text>

        {/* Start time ----------------------------------------------------- */}
        <Pressable
          style={styles.pickerButton}
          onPress={() =>
            Platform.OS === 'android'
              ? DateTimePickerAndroid.open({
                  value: start,
                  mode: 'date',
                  onChange: (_e, d) => {
                    if (!d) return;
                    openTime(d, setStart);
                  },
                })
              : setShowStartPicker(true)
          }
        >
          <Text style={{ color: colours.text }}>Start: {start.toLocaleString()}</Text>
        </Pressable>
        {Platform.OS === 'ios' && showStartPicker && (
          <DateTimePicker
            value={start}
            mode="datetime"
            onChange={handleStartPicked}
          />
        )}

        {/* End time ------------------------------------------------------- */}
        <Pressable
          style={styles.pickerButton}
          onPress={() =>
            Platform.OS === 'android'
              ? DateTimePickerAndroid.open({
                  value: end ?? new Date(),
                  mode: 'date',
                  onChange: (_e, d) => {
                    if (!d) return;
                    openTime(d, setEnd);
                  },
                })
              : setShowEndPicker(true)
          }
        >
          <Text style={{ color: colours.text }}>
            End:{' '}
            {end ? end.toLocaleString() : '—'}
          </Text>
        </Pressable>
        {Platform.OS === 'ios' && showEndPicker && (
          <DateTimePicker
            value={end ?? new Date()}
            mode="datetime"
            onChange={handleEndPicked}
          />
        )}

        {/* Quality slider ------------------------------------------------- */}
        <TextInput
          style={[styles.input, { color: colours.text, borderColor: colours.text }]}
          keyboardType="numeric"
          placeholder="Quality (1-10, optional)"
          placeholderTextColor={colours.text}
          value={qualityText}
          onChangeText={setQualityText}
        />

        {/* Tags ----------------------------------------------------------- */}
        <TextInput
          style={[styles.input, { color: colours.text, borderColor: colours.text }]}
          placeholder="Tags (comma-separated)"
          placeholderTextColor={colours.text}
          value={tagsText}
          onChangeText={setTagsText}
        />

        {/* Buttons -------------------------------------------------------- */}
        <View style={styles.buttonRow}>
          <Button title="Cancel" onPress={onClose} />
          <Button title="Save" onPress={save} />
        </View>
        {defaultValues.id && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={async () => {
              await useSleepStore.getState().remove(defaultValues.id!);
              onClose();
            }}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: '600',
  },
  pickerButton: {
    paddingVertical: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginVertical: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  deleteBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#e53935',
    marginTop: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
  },
});
