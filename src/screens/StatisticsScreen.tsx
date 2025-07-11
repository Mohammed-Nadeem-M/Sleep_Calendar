import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { impactColour, formatDurationDelta } from '../utils/format';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSleepStore, SleepLog, durationHours } from '../store/sleepStore';
import { useNavigation } from '@react-navigation/native';
import { useColours } from '../store/themeStore';
import TagImpactMirrorChart from '../components/TagImpactMirrorChart';

/* -------------------------------------------------------------------------- */
/*                               Helper utils                                 */
/* -------------------------------------------------------------------------- */
const average = (arr: number[]) =>
  arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

const allEqual = (arr: number[]) =>
  arr.length > 0 && arr.every((v) => v === arr[0]);

type Impact = {
  tag: string;
  count: number;
  qual: number;
  dur: number;
  dq: number;
  dd: number;
};

function computeImpacts(logs: SleepLog[]): Impact[] {
  const tagCounts: Record<string, number> = {};
  logs.forEach((l) => l.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));

  const tags = Object.keys(tagCounts);

  const impacts: Impact[] = [];
  const avg = (arr: SleepLog[], f: (l: SleepLog) => number) => average(arr.map(f));

  for (const tag of tags) {
    const withT = logs.filter((l) => l.tags.includes(tag));
    const withoutT = logs.filter((l) => !l.tags.includes(tag));
    impacts.push({
      tag,
      count: tagCounts[tag],
      qual: avg(withT, (l) => l.quality ?? 0),
      dur: avg(withT, (l) => durationHours(l) ?? 0),
      dq: avg(withT, (l) => l.quality ?? 0) - avg(withoutT, (l) => l.quality ?? 0),
      dd:
        avg(withT, (l) => durationHours(l) ?? 0) -
        avg(withoutT, (l) => durationHours(l) ?? 0),
    });
  }
  return impacts.sort((a, b) => b.count - a.count);
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */
export default function StatisticsScreen() {
  const navigation = useNavigation();
  const logs = useSleepStore((s) => s.logs);
  const colours = useColours();

  /* ---------------------- dynamic chart colours ---------------------- */
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colours.background,
      backgroundGradientFrom: colours.background,
      backgroundGradientTo: colours.background,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(33,150,243,${opacity})`,
      labelColor: (_ = 1) => colours.text,
      propsForBackgroundLines: { stroke: 'transparent' },
    }),
    [colours],
  );

  const ranges = [30, 60, 90] as const;
  const [rangeDays, setRangeDays] = useState<typeof ranges[number] | 'custom'>(30);
  const [customDays, setCustomDays] = useState('30');
  const [customMode, setCustomMode] = useState<'days' | 'range'>('days');
  const [lowerDate, setLowerDate] = useState<Date>(new Date(Date.now() - 7 * 86_400_000));
  const [upperDate, setUpperDate] = useState<Date>(new Date());
  const [sampleSize, setSampleSize] = useState('3');
  const [showLowerPicker, setShowLowerPicker] = useState(false);
  const [showUpperPicker, setShowUpperPicker] = useState(false);

  const filtered = useMemo(() => {
    if (rangeDays === 'custom') {
      if (customMode === 'range') {
        const startTs = new Date(
          lowerDate.getFullYear(),
          lowerDate.getMonth(),
          lowerDate.getDate()
        ).getTime();
        const endTs = new Date(
          upperDate.getFullYear(),
          upperDate.getMonth(),
          upperDate.getDate(),
          23,
          59,
          59,
          999
        ).getTime();
        return logs.filter((l) => {
          const t = new Date(l.start).getTime();
          return t >= startTs && t <= endTs;
        });
      }
      const n = Number(customDays) || 0;
      if (!n) return logs;
      const cutoff = Date.now() - n * 86_400_000;
      return logs.filter((l) => new Date(l.start).getTime() >= cutoff);
    }
    const cutoff = Date.now() - rangeDays * 86_400_000;
    return logs.filter((l) => new Date(l.start).getTime() >= cutoff);
  }, [
    logs,
    rangeDays,
    customDays,
    customMode,
    lowerDate,
    upperDate,
  ]);

  /* --------------------------- chart data --------------------------- */
  const chartWidth = Dimensions.get('window').width - 24;

  const datesFull = filtered
    .map((l) => l.start.slice(0, 10))
    .sort()
    .slice(-30); // keep labels reasonable

  /* x-axis labels at ~fifths (first / quarter / half / three-quarter / last) */
  const labelIndices = (() => {
    const n = datesFull.length;
    if (n === 0) return [];
    const idxs = [0];
    for (let k = 1; k <= 3; k++) idxs.push(Math.round((k * n) / 4));
    idxs.push(n - 1);
    return Array.from(new Set(idxs)).sort((a, b) => a - b);
  })();

  const dates = datesFull.map((d, i) =>
    labelIndices.includes(i) ? d.slice(5) : '',
  );

  const durData = datesFull.map((d) => {
    const ls = filtered.filter((l) => l.start.startsWith(d));
    return average(ls.map((l) => durationHours(l) ?? 0));
  });
  const qualData = datesFull.map((d) => {
    const ls = filtered.filter((l) => l.start.startsWith(d) && l.quality !== undefined);
    return average(ls.map((l) => l.quality ?? 0));
  });

  const showDurChart = durData.length >= 2 && !allEqual(durData);
  const showQualChart = qualData.length >= 2 && !allEqual(qualData);

  const impacts = useMemo(() => computeImpacts(filtered), [filtered]);

  /* --------------------------- tag incidence pie -------------------- */
  const pieData = useMemo(() => {
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
    return impacts
      .slice(0, 10)
      .map((i, idx) => ({
        name: `${i.tag} (${i.count})`,
        population: i.count,
        color: palette[idx % palette.length],
        legendFontColor: colours.text,
        legendFontSize: 12,
      }));
  }, [impacts, colours.text]);

  /* ----------- top-incidence positive & negative (mixed) list ---------- */
  const topIncidence = useMemo(() => {
    const positiveIncidence = impacts
      .filter((i) => i.dq + i.dd > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const negativeIncidence = impacts
      .filter((i) => i.dq + i.dd < 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return [...positiveIncidence, ...negativeIncidence].sort(
      (a, b) => b.count - a.count,
    );
  }, [impacts]);

  const minSample = Math.max(Number(sampleSize) || 3, 3);
  const positive = impacts
    .filter((i) => i.count >= minSample && i.dq > 0)
    .sort((a, b) => b.dq - a.dq)
    .slice(0, 5);
  const negative = impacts
    .filter((i) => i.count >= minSample && i.dq < 0)
    .sort((a, b) => a.dq - b.dq)
    .slice(0, 5);

  /* ----------------------------- render ----------------------------- */
  return (
    <ScrollView style={{ flex: 1, padding: 12, backgroundColor: colours.background }}>
      {/* Segment control */}
      <View style={styles.segmentRow}>
        {ranges.map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.segmentButton,
              rangeDays === d && styles.segmentActive,
            ]}
            onPress={() => setRangeDays(d)}
          >
            <Text style={rangeDays === d ? styles.segmentActiveText : { color: colours.text }}>
              {d}d
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.segmentButton,
            rangeDays === 'custom' && styles.segmentActive,
          ]}
          onPress={() => setRangeDays('custom')}
        >
          <Text style={rangeDays === 'custom' ? styles.segmentActiveText : { color: colours.text }}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>
      {rangeDays === 'custom' && (
        <>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                customMode === 'days' && styles.segmentActive,
              ]}
              onPress={() => setCustomMode('days')}
            >
              <Text
                style={
                  customMode === 'days'
                    ? styles.segmentActiveText
                    : { color: colours.text }
                }
              >
                Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                customMode === 'range' && styles.segmentActive,
              ]}
              onPress={() => setCustomMode('range')}
            >
              <Text
                style={
                  customMode === 'range'
                    ? styles.segmentActiveText
                    : { color: colours.text }
                }
              >
                Range
              </Text>
            </TouchableOpacity>
          </View>

          {customMode === 'days' ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
            >
              <Text style={[styles.textLine, { color: colours.text }]}>Days:</Text>
              <TextInput
                value={customDays}
                onChangeText={setCustomDays}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  { marginLeft: 4, color: colours.text, borderColor: colours.text },
                ]}
                placeholderTextColor={colours.text}
              />
            </View>
          ) : (
            <>
              <Pressable
                style={styles.pickerButton}
                onPress={() =>
                  Platform.OS === 'android'
                    ? DateTimePickerAndroid.open({
                        value: lowerDate,
                        mode: 'date',
                        onChange: (_e, d) => {
                          if (d) setLowerDate(d);
                        },
                      })
                    : setShowLowerPicker(true)
                }
              >
                <Text style={{ color: colours.text }}>From: {lowerDate.toLocaleDateString()}</Text>
              </Pressable>
              {Platform.OS === 'ios' && showLowerPicker && (
                <DateTimePicker
                  value={lowerDate}
                  mode="date"
                  onChange={(_e, d) => {
                    if (d) setLowerDate(d);
                    setShowLowerPicker(false);
                  }}
                />
              )}

              <Pressable
                style={styles.pickerButton}
                onPress={() =>
                  Platform.OS === 'android'
                    ? DateTimePickerAndroid.open({
                        value: upperDate,
                        mode: 'date',
                        onChange: (_e, d) => {
                          if (d) setUpperDate(d);
                        },
                      })
                    : setShowUpperPicker(true)
                }
              >
                <Text style={{ color: colours.text }}>To: {upperDate.toLocaleDateString()}</Text>
              </Pressable>
              {Platform.OS === 'ios' && showUpperPicker && (
                <DateTimePicker
                  value={upperDate}
                  mode="date"
                  onChange={(_e, d) => {
                    if (d) setUpperDate(d);
                    setShowUpperPicker(false);
                  }}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Charts */}
      <Text style={[styles.sectionTitle, { color: colours.text }]}>Duration (h)</Text>
      {showDurChart ? (
        <LineChart
          data={{ labels: dates, datasets: [{ data: durData }] }}
          width={chartWidth}
          height={180}
          withDots={false}
          withInnerLines={false}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      ) : (
        <Text style={[styles.noDataText, { color: colours.text }]}>Not enough data</Text>
      )}

      <Text style={[styles.sectionTitle, { color: colours.text }]}>Quality (/10)</Text>
      {showQualChart ? (
        <LineChart
          data={{
            labels: dates,
            datasets: [{ data: qualData }],
          }}
          width={chartWidth}
          height={180}
          withDots={false}
          withInnerLines={false}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      ) : (
        <Text style={[styles.noDataText, { color: colours.text }]}>Not enough data</Text>
      )}

      {/* Tag incidence wheel */}
      {pieData.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colours.text }]}>
            Tag incidence
          </Text>
          <PieChart
            data={pieData}
            width={chartWidth}
            height={220}
            accessor="population"
            chartConfig={{
              ...chartConfig,
              backgroundGradientFrom: colours.background,
              backgroundGradientTo: colours.background,
              color: () => colours.text,
              labelColor: () => colours.text,
            }}
            backgroundColor={colours.background}
            paddingLeft="15"
            hasLegend
            style={{ alignSelf: 'center', marginVertical: 12 }}
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colours.text }]}>Tag impact</Text>
      <TagImpactMirrorChart impacts={impacts} />

      {/* Top tags */}
      <Text style={[styles.sectionTitle, { color: colours.text }]}>Top tags (incidence & impact)</Text>
      {topIncidence.map((i) => (
        <Text key={i.tag} style={[styles.textLine, { color: colours.text }]}>
          {i.tag} ({i.count}): Quality <Text style={{color: impactColour(i.dq)}}>{i.dq > 0 ? '+' : ''}{i.dq.toFixed(1)}</Text> / Duration <Text style={{color: impactColour(i.dd)}}>{formatDurationDelta(i.dd)}</Text>
        </Text>
      ))}

      {/* Severity table */}
      <Text style={[styles.sectionTitle, { color: colours.text }]}>Tag severity table</Text>
      <Text style={[styles.textLine, { color: colours.text }]}>Sample size (≥3):</Text>
      <TextInput
        value={sampleSize}
        onChangeText={setSampleSize}
        keyboardType="number-pad"
        style={[styles.input, { color: colours.text, borderColor: colours.text }]}
        placeholderTextColor={colours.text}
      />
      <View style={styles.tableRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tableHeader, { color: colours.text }]}>Most Positive</Text>
          {positive.map((i) => (
            <Text key={i.tag} style={[styles.textLine, { color: colours.text }]}>
              {i.tag} ({i.count}) <Text style={{color: impactColour(i.dq)}}>{i.dq > 0 ? '+' : ''}{i.dq.toFixed(1)}</Text> / <Text style={{color: impactColour(i.dd)}}>{formatDurationDelta(i.dd)}</Text>
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tableHeader, { color: colours.text }]}>Most Negative</Text>
          {negative.map((i) => (
            <Text key={i.tag} style={[styles.textLine, { color: colours.text }]}>
              {i.tag} ({i.count}) <Text style={{color: impactColour(i.dq)}}>{i.dq > 0 ? '+' : ''}{i.dq.toFixed(1)}</Text> / <Text style={{color: impactColour(i.dd)}}>{formatDurationDelta(i.dd)}</Text>
            </Text>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.detailsBtn}
        onPress={() => navigation.navigate('TagDetails' as never)}
      >
        <Text style={{ color: '#fff' }}>Open Tag Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  segmentRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginRight: 4,
  },
  segmentActive: { backgroundColor: '#2196f3' },
  segmentActiveText: { color: '#fff' },
  chart: { marginVertical: 8 },
  sectionTitle: { fontWeight: '600', marginTop: 12 },
  textLine: { fontSize: 12, marginTop: 2 },
  tableRow: { flexDirection: 'row', marginTop: 8 },
  tableHeader: { fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    width: 60,
    marginTop: 4,
  },
  compareBtn: {
    alignSelf: 'center',
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  detailsBtn: {
    marginTop: 12,
    marginBottom: 24,
    alignSelf: 'center',
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  noDataText: { fontStyle: 'italic', color: '#999', marginVertical: 8 },
  pickerButton: {
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 4,
    marginVertical: 4,
  },
});
