import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StatisticsStackParamList } from '../navigation/AppNavigator';
import { useColours } from '../store/themeStore';
import { useSleepStore, SleepLog, durationHours } from '../store/sleepStore';
import { impactColour, formatDurationDelta } from '../utils/format';

const average = (arr: number[]) =>
  arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

function statsFor(tag: string, logs: SleepLog[]) {
  const withT = logs.filter((l) => l.tags.includes(tag));
  const withoutT = logs.filter((l) => !l.tags.includes(tag));
  return {
    count: withT.length,
    avgDur: average(withT.map((l) => durationHours(l) ?? 0)),
    avgQual: average(withT.map((l) => l.quality ?? 0)),
    dq:
      average(withT.map((l) => l.quality ?? 0)) -
      average(withoutT.map((l) => l.quality ?? 0)),
    dd:
      average(withT.map((l) => durationHours(l) ?? 0)) -
      average(withoutT.map((l) => durationHours(l) ?? 0)),
  };
}

export default function TagStatsScreen() {
  type TagStatsRouteProp = RouteProp<StatisticsStackParamList, 'TagStats'>;
  const route = useRoute<TagStatsRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<StatisticsStackParamList>>();
  const colours = useColours();
  const logs = useSleepStore((s) => s.logs);

  const tag = route.params?.tag ?? '';
  const s = useMemo(() => statsFor(tag, logs), [tag, logs]);

    const [renameInput, setRenameInput] = useState(tag);
    const [showRenameModal, setShowRenameModal] = useState(false);

  const tagLogs = useMemo(
    () => logs.filter((l) => l.tags.includes(tag)),
    [logs, tag],
  );

  const countsFor = (ls: SleepLog[], f: (d: Date) => number, size: number) => {
    const out = Array(size).fill(0);
    ls.forEach((l) => out[f(new Date(l.start))]++);
    return out;
  };

  const hm = {
    dow: countsFor(tagLogs, (d) => d.getDay(), 7),
    dom: countsFor(tagLogs, (d) => d.getDate() - 1, 31),
    moy: countsFor(tagLogs, (d) => d.getMonth(), 12),
  };

  const deltaFor = (
    tag: string,
    f: (d: Date) => number,
    size: number,
  ): number[] => {
    const out = Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      const withT = logs.filter(
        (l) =>
          l.tags.includes(tag) &&
          f(new Date(l.start)) === i &&
          l.quality !== undefined,
      );
      const withoutT = logs.filter(
        (l) =>
          !l.tags.includes(tag) &&
          f(new Date(l.start)) === i &&
          l.quality !== undefined,
      );
      const avg = (arr: SleepLog[]) =>
        arr.length
          ? arr.reduce((s, l) => s + (l.quality ?? 0), 0) / arr.length
          : 0;
      out[i] = avg(withT) - avg(withoutT);
    }
    return out;
  };

  const hd = {
    dow: deltaFor(tag, (d) => d.getDay(), 7),
    dom: deltaFor(tag, (d) => d.getDate() - 1, 31),
    moy: deltaFor(tag, (d) => d.getMonth(), 12),
  };

  const globalMax = Math.max(...hm.dow, ...hm.dom, ...hm.moy, 1);
  const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const cellColour = (
    count: number,
    delta: number,
    maxCount: number,
    bg: string,
  ) => {
    if (count === 0) return bg;
    const alpha = 0.2 + 0.8 * (count / (maxCount || 1));
    if (Math.abs(delta) < 1e-3) return `rgba(128,128,128,${alpha})`;
    return delta > 0
      ? `rgba(76,175,80,${alpha})`
      : `rgba(244,67,54,${alpha})`;
  };

  function Heatmap({
    counts,
    deltas,
    labels,
    bg,
    max,
  }: {
    counts: number[];
    deltas: number[];
    labels: string[];
    bg: string;
    max: number;
  }) {
    const colours = useColours();
    return (
      <View style={{ marginVertical: 4, alignSelf: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: Math.min(labels.length, 7) * 28,
          }}
        >
          {counts.map((c, i) => (
            <View
              key={i}
              style={{
                width: 24,
                marginRight: 4,
                marginBottom: 4,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: cellColour(c, deltas[i], max, bg),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 8, color: colours.text }}>{c}</Text>
              </View>
              <Text style={{ fontSize: 8, color: colours.text }}>
                {labels[i]}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 4 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
          >
            {[0.25, 0.6, 1].map((f) => (
              <View
                key={`pos-${f}`}
                style={{
                  width: 24,
                  height: 12,
                  backgroundColor: `rgba(76,175,80,${0.2 + 0.8 * f})`,
                  marginRight: 4,
                }}
              />
            ))}
            <Text style={{ fontSize: 8, color: colours.text }}>
              Positive impact
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
          >
            <View
              style={{
                width: 24,
                height: 12,
                backgroundColor: 'grey',
                marginRight: 4,
              }}
            />
            <Text style={{ fontSize: 8, color: colours.text }}>
              No / neutral data
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {[0.25, 0.6, 1].map((f) => (
              <View
                key={`neg-${f}`}
                style={{
                  width: 24,
                  height: 12,
                  backgroundColor: `rgba(244,67,54,${0.2 + 0.8 * f})`,
                  marginRight: 4,
                }}
              />
            ))}
            <Text style={{ fontSize: 8, color: colours.text }}>
              Negative impact
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const askRename = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Rename Tag',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async (txt) => {
              if (!txt?.trim()) return;
              await useSleepStore.getState().renameTag(tag, txt.trim());
              navigation.goBack();
            },
          },
        ],
        'plain-text',
        tag,
      );
    } else {
      setRenameInput(tag);
      setShowRenameModal(true);
    }
  };

  const handleSaveRename = async () => {
    const newName = renameInput.trim();
    if (!newName) return;
    await useSleepStore.getState().renameTag(tag, newName);
    setShowRenameModal(false);
    navigation.goBack();
  };

  const askDelete = () =>
    Alert.alert(
      'Delete Tag',
      `Remove "${tag}" from ${s.count} sleep log(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await useSleepStore.getState().deleteTag(tag);
            navigation.goBack();
          },
        },
      ],
    );

  return (
    <View style={[styles.container, { backgroundColor: colours.background, flex: 1 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={[styles.title, { color: colours.text }]}>{tag}</Text>
      <Text style={{ color: colours.text }}>Logged { s.count } times</Text>

      <View style={styles.statBlock}>
        <Text style={{ color: colours.text }}>
          Avg duration: {s.avgDur.toFixed(2)} h
        </Text>
        <Text style={{ color: impactColour(s.dq) }}>
          Quality impact: {s.dq > 0 ? '+' : ''}
          {s.dq.toFixed(1)}
        </Text>
        <Text style={{ color: impactColour(s.dd) }}>
          Duration impact: {formatDurationDelta(s.dd)}
        </Text>
      </View>

      {/* heat-maps ------------------------------------------------------ */}
      <Text style={[styles.sectionTitle, { color: colours.text }]}>
        Usage by day of week
      </Text>
      <Heatmap
        counts={hm.dow}
        deltas={hd.dow}
        labels={dayNames}
        bg={colours.background}
        max={globalMax}
      />

      <Text style={[styles.sectionTitle, { color: colours.text }]}>
        Usage by day of month
      </Text>
      <Heatmap
        counts={hm.dom}
        deltas={hd.dom}
        labels={Array.from({ length: 31 }, (_, i) => (i + 1).toString())}
        bg={colours.background}
        max={globalMax}
      />

      <Text style={[styles.sectionTitle, { color: colours.text }]}>
        Usage by month
      </Text>
      <Heatmap
        counts={hm.moy}
        deltas={hd.moy}
        labels={[
          'J',
          'F',
          'M',
          'A',
          'M',
          'J',
          'J',
          'A',
          'S',
          'O',
          'N',
          'D',
        ]}
        bg={colours.background}
        max={globalMax}
      />

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.compareBtn, { borderColor: colours.text }]}
          onPress={() =>
            navigation.navigate({ name: 'CompareTags', params: { tag1: tag } })
          }
        >
          <Text style={{ color: colours.text }}>Compare</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={askRename}>
          <Text style={{ color: '#fff' }}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#f44336' }]}
          onPress={askDelete}
        >
          <Text style={{ color: '#fff' }}>Delete</Text>
        </TouchableOpacity>
      </View>

      </ScrollView>
      {Platform.OS === 'android' && showRenameModal && (
        <Modal
          transparent
          animationType="fade"
          visible={true}
          onRequestClose={() => setShowRenameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colours.background },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colours.text }]}>
                Rename Tag
              </Text>
              <TextInput
                value={renameInput}
                onChangeText={setRenameInput}
                style={[
                  styles.input,
                  { color: colours.text, borderColor: colours.text },
                ]}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setShowRenameModal(false)}
                  style={styles.modalBtn}
                >
                  <Text style={{ color: colours.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveRename}
                  style={styles.modalBtn}
                >
                  <Text style={{ color: colours.text, fontWeight: 'bold' }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  statBlock: { marginTop: 12 },
  btnRow: { flexDirection: 'row', marginTop: 24 },
  btn: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  compareBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 12,
  },
  sectionTitle: { fontWeight: '600', marginTop: 16, alignSelf: 'center' },

  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#0007',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: { marginLeft: 16 },
});
