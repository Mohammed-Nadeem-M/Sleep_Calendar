import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StatisticsStackParamList } from '../navigation/AppNavigator';
import { useColours } from '../store/themeStore';
import { useSleepStore, SleepLog, durationHours } from '../store/sleepStore';
import {
  impactColour,
  formatDurationDelta,
} from '../utils/format';

const average = (arr: number[]) =>
  arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

type TagStat = {
  tag: string;
  count: number;
  avgDur: number;
  avgQual: number;
  dq: number;
  dd: number;
};

function computeStats(logs: SleepLog[]): TagStat[] {
  const counts: Record<string, number> = {};
  logs.forEach((l) => l.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  const tags = Object.keys(counts);

  const avg = (arr: SleepLog[], f: (l: SleepLog) => number) =>
    average(arr.map(f));

  const stats: TagStat[] = [];

  for (const tag of tags) {
    const withT = logs.filter((l) => l.tags.includes(tag));
    const withoutT = logs.filter((l) => !l.tags.includes(tag));
    stats.push({
      tag,
      count: counts[tag],
      avgDur: avg(withT, (l) => durationHours(l) ?? 0),
      avgQual: avg(withT, (l) => l.quality ?? 0),
      dq: avg(withT, (l) => l.quality ?? 0) - avg(withoutT, (l) => l.quality ?? 0),
      dd:
        avg(withT, (l) => durationHours(l) ?? 0) -
        avg(withoutT, (l) => durationHours(l) ?? 0),
    });
  }
  return stats.sort((a, b) => b.count - a.count);
}

export default function TagDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StatisticsStackParamList>>();
  const colours = useColours();
  const logs = useSleepStore((s) => s.logs);
  const [query, setQuery] = useState('');
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const stats = useMemo(() => computeStats(logs), [logs]);
  const filtered = useMemo(
    () => stats.filter((s) => s.tag.toLowerCase().includes(query.toLowerCase())),
    [stats, query],
  );

  const palette = [
    '#2196f3',
    '#f44336',
    '#ff9800',
    '#9c27b0',
    '#4caf50',
    '#e91e63',
    '#03a9f4',
    '#ffeb3b',
    '#8bc34a',
    '#673ab7',
  ];

  const pieData = filtered.slice(0, 10).map((s, i) => ({
    name: `${s.tag} (${s.count})`,
    population: s.count,
    color: palette[i % palette.length],
    legendFontColor: colours.text,
    legendFontSize: 12,
  }));

  const handleSaveRename = async () => {
    if (!renamingTag) return;
    const newName = renameInput.trim();
    if (!newName) return;
    await useSleepStore.getState().renameTag(renamingTag, newName);
    setRenamingTag(null);
  };

  const width = Dimensions.get('window').width - 24;

  const handleTagPress = (tag: string, count: number) => {
    Alert.alert(tag, 'Choose an action', [
      {
        text: 'Rename',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Alert.prompt(
              'Rename Tag',
              `Enter new name for "${tag}"`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: async (newName) => {
                    if (!newName?.trim()) return;
                    await useSleepStore.getState().renameTag(tag, newName.trim());
                  },
                },
              ],
              'plain-text',
              tag,
            );
          } else {
            setRenamingTag(tag);
            setRenameInput(tag);
          }
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete Tag',
            `Remove "${tag}" from ${count} sleep log(s)? This cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await useSleepStore.getState().deleteTag(tag);
                },
              },
            ],
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: TagStat }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate({ name: 'TagStats', params: { tag: item.tag } })
      }
      onLongPress={() => handleTagPress(item.tag, item.count)}
    >
      <View style={styles.row}>
        <Text style={[styles.tag, { color: colours.text }]}>
          {item.tag} ({item.count})
        </Text>
        <Text style={{ color: impactColour(item.dq) }}>
          {item.dq > 0 ? '+' : ''}
          {item.dq.toFixed(1)}
        </Text>
        <Text style={{ color: impactColour(item.dd), marginLeft: 8 }}>
          {formatDurationDelta(item.dd)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colours.background, padding: 12 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search tags"
        placeholderTextColor={colours.text}
        style={[
          styles.input,
          { color: colours.text, borderColor: colours.text },
        ]}
      />

      <TouchableOpacity
        style={[styles.compareBtn, { borderColor: colours.text }]}
        onPress={() => navigation.navigate({ name: 'CompareTags', params: {} })}
      >
        <Text style={{ color: colours.text }}>Compare Tags</Text>
      </TouchableOpacity>

      {pieData.length > 0 && (
        <PieChart
          data={pieData}
          width={width}
          height={220}
          accessor="population"
          chartConfig={{
            backgroundGradientFrom: colours.background,
            backgroundGradientTo: colours.background,
            decimalPlaces: 1,
            color: () => colours.text,
            labelColor: () => colours.text,
          }}
          backgroundColor={colours.background}
          paddingLeft="15"
          hasLegend
          style={{ alignSelf: 'center', marginVertical: 12 }}
        />
      )}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.tag}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      {filtered.length === 0 && (
        <Text
          style={{ color: colours.text, alignSelf: 'center', marginTop: 24 }}
        >
          No tags match your search.
        </Text>
      )}

      {Platform.OS === 'android' && renamingTag && (
        <Modal
          transparent
          animationType="fade"
          visible={true}
          onRequestClose={() => setRenamingTag(null)}
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
                  onPress={() => setRenamingTag(null)}
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#4443',
  },
  tag: { flex: 1, fontWeight: '500' },
  compareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
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
  modalBtn: {
    marginLeft: 16,
  },
});
