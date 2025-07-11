import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useColours } from '../store/themeStore';
import { useSleepStore, durationHours, SleepLog } from '../store/sleepStore';

/* ------------------------------------------------------------------ */
/*                            helpers                                  */
/* ------------------------------------------------------------------ */
const average = (arr: number[]) =>
  arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

function statsForTag(tag: string, logs: SleepLog[]) {
  const withT = logs.filter((l) => l.tags.includes(tag));
  const withoutT = logs.filter((l) => !l.tags.includes(tag));
  return {
    count: withT.length,
    avgDur: average(withT.map((l) => durationHours(l) ?? 0)),
    avgQual: average(withT.map((l) => l.quality ?? 0)),
    dq: average(withT.map((l) => l.quality ?? 0)) -
      average(withoutT.map((l) => l.quality ?? 0)),
    dd: average(withT.map((l) => durationHours(l) ?? 0)) -
      average(withoutT.map((l) => durationHours(l) ?? 0)),
    logs: withT,
  };
}

const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
/* colour determined by quality delta (red-green) and incidence (alpha) */
const cellColour = (
  count: number,
  delta: number,
  maxCount: number,
  bg: string,
) => {
  if (count === 0) return bg; // no data
  const alpha = 0.2 + 0.8 * (count / (maxCount || 1)); // incidence scale
  if (Math.abs(delta) < 1e-3) return `rgba(128,128,128,${alpha})`; // neutral
  // positive impact → green, negative → red
  return delta > 0
    ? `rgba(76,175,80,${alpha})` // material green 500
    : `rgba(244,67,54,${alpha})`; // material red 500
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
    <View style={{ marginVertical: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 7 * 28 }}>
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

      {/* legend – three rows ------------------------------------------- */}
      <View style={{ marginTop: 4 }}>
        {/* positive */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
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
          <Text style={{ fontSize: 8, color: colours.text }}>Positive impact</Text>
        </View>
        {/* neutral */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <View
            style={{
              width: 24,
              height: 12,
              backgroundColor: 'grey',
              marginRight: 4,
            }}
          />
          <Text style={{ fontSize: 8, color: colours.text }}>No / neutral data</Text>
        </View>
        {/* negative */}
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
          <Text style={{ fontSize: 8, color: colours.text }}>Negative impact</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*                            screen                                   */
/* ------------------------------------------------------------------ */
export default function CompareTagsScreen() {
  type CompareTagsRouteProp = RouteProp<{ CompareTags: { tag1?: string } }, 'CompareTags'>;
  const route = useRoute<CompareTagsRouteProp>();
  const colours = useColours();
  const logs = useSleepStore((s) => s.logs);

  /* all tag names */
  const tagCounts = useMemo(() => {
    const c: Record<string, number> = {};
    logs.forEach((l) => l.tags.forEach((t) => (c[t] = (c[t] || 0) + 1)));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [logs]);

  const [tag1, setTag1] = useState<string>(route.params?.tag1 ?? tagCounts[0] ?? '');
  const [tag2, setTag2] = useState<string>(tagCounts.find((t) => t !== tag1) ?? '');

  const pickTag = (which: 1 | 2) =>
    Alert.alert(
      'Select tag',
      '',
      tagCounts.map((t) => ({
        text: t,
        onPress: () => (which === 1 ? setTag1(t) : setTag2(t)),
      })),
    );

  const s1 = useMemo(() => statsForTag(tag1, logs), [tag1, logs]);
  const s2 = useMemo(() => statsForTag(tag2, logs), [tag2, logs]);

  /* heat-map counts --------------------------------------------------- */
  const countsFor = (ls: SleepLog[], f: (d: Date) => number, size: number) => {
    const out = Array(size).fill(0);
    ls.forEach((l) => out[f(new Date(l.start))]++);
    return out;
  };

  const hm1 = {
    dow: countsFor(s1.logs, (d) => d.getDay(), 7),
    dom: countsFor(s1.logs, (d) => d.getDate() - 1, 31),
    moy: countsFor(s1.logs, (d) => d.getMonth(), 12),
  };
  const hm2 = {
    dow: countsFor(s2.logs, (d) => d.getDay(), 7),
    dom: countsFor(s2.logs, (d) => d.getDate() - 1, 31),
    moy: countsFor(s2.logs, (d) => d.getMonth(), 12),
  };

  /* quality deltas per bucket ---------------------------------------- */
  const deltaFor = (
    tag: string,
    f: (d: Date) => number,
    size: number,
  ): number[] => {
    const out = Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      const withT = logs.filter(
        (l) => l.tags.includes(tag) && f(new Date(l.start)) === i && l.quality,
      );
      const withoutT = logs.filter(
        (l) => !l.tags.includes(tag) && f(new Date(l.start)) === i && l.quality,
      );
      const avg = (arr: SleepLog[]) =>
        arr.length ? arr.reduce((s, l) => s + (l.quality ?? 0), 0) / arr.length : 0;
      out[i] = avg(withT) - avg(withoutT);
    }
    return out;
  };

  const hd1 = {
    dow: deltaFor(tag1, (d) => d.getDay(), 7),
    dom: deltaFor(tag1, (d) => d.getDate() - 1, 31),
    moy: deltaFor(tag1, (d) => d.getMonth(), 12),
  };
  const hd2 = {
    dow: deltaFor(tag2, (d) => d.getDay(), 7),
    dom: deltaFor(tag2, (d) => d.getDate() - 1, 31),
    moy: deltaFor(tag2, (d) => d.getMonth(), 12),
  };

  /* use one scale for both tags so colours are comparable */
  const globalMax = Math.max(
    ...hm1.dow,
    ...hm1.dom,
    ...hm1.moy,
    ...hm2.dow,
    ...hm2.dom,
    ...hm2.moy,
    1,
  );

  const width = Dimensions.get('window').width - 24;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colours.background, padding: 12 }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* tag selectors -------------------------------------------------- */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: colours.text, marginBottom: 4 }}>Tag 1:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tagCounts.map((t) => (
            <TouchableOpacity
              key={`t1-${t}`}
              onPress={() => setTag1(t)}
              style={[
                styles.tagChip,
                { borderColor: colours.text },
                tag1 === t && styles.tagChipActive,
              ]}
            >
              <Text style={{ color: tag1 === t ? '#fff' : colours.text }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={{ color: colours.text, marginVertical: 4 }}>Tag 2:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tagCounts.map((t) => (
            <TouchableOpacity
              key={`t2-${t}`}
              onPress={() => setTag2(t)}
              style={[
                styles.tagChip,
                { borderColor: colours.text },
                tag2 === t && styles.tagChipActive,
              ]}
            >
              <Text style={{ color: tag2 === t ? '#fff' : colours.text }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* basic stats ---------------------------------------------------- */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        {[{ tag: tag1, s: s1 }, { tag: tag2, s: s2 }].map(({ tag, s }, idx) => (
          <View key={idx} style={{ alignItems: 'center', width: width / 2 - 20 }}>
            <Text style={[styles.subTitle, { color: colours.text }]}>{tag}</Text>
            <Text style={{ color: colours.text }}>
              Avg duration: {s.avgDur.toFixed(2)} h
            </Text>
            <Text style={{ color: colours.text }}>
              Quality impact: {s.dq > 0 ? '+' : ''}
              {s.dq.toFixed(1)}
            </Text>
          </View>
        ))}
      </View>

      {/* heat-maps ------------------------------------------------------ */}
      <Text style={[styles.section, { color: colours.text }]}>Usage by day of week</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        <Heatmap
          counts={hm1.dow}
          deltas={hd1.dow}
          labels={dayNames}
          bg={colours.background}
          max={globalMax}
        />
        <View
          style={{
            width: 1,
            backgroundColor: colours.text + '55',
            marginHorizontal: 4,
          }}
        />
        <Heatmap
          counts={hm2.dow}
          deltas={hd2.dow}
          labels={dayNames}
          bg={colours.background}
          max={globalMax}
        />
      </View>

      <Text style={[styles.section, { color: colours.text }]}>Usage by day of month</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        <Heatmap
          counts={hm1.dom}
          deltas={hd1.dom}
          labels={Array.from({ length: 31 }, (_, i) => (i + 1).toString())}
          bg={colours.background}
          max={globalMax}
        />
        <View
          style={{
            width: 1,
            backgroundColor: colours.text + '55',
            marginHorizontal: 4,
          }}
        />
        <Heatmap
          counts={hm2.dom}
          deltas={hd2.dom}
          labels={Array.from({ length: 31 }, (_, i) => (i + 1).toString())}
          bg={colours.background}
          max={globalMax}
        />
      </View>

      <Text style={[styles.section, { color: colours.text }]}>Usage by month</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        <Heatmap
          counts={hm1.moy}
          deltas={hd1.moy}
          labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
          bg={colours.background}
          max={globalMax}
        />
        <View
          style={{
            width: 1,
            backgroundColor: colours.text + '55',
            marginHorizontal: 4,
          }}
        />
        <Heatmap
          counts={hm2.moy}
          deltas={hd2.moy}
          labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
          bg={colours.background}
          max={globalMax}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  tagChipActive: { backgroundColor: '#2196f3' },
  subTitle: { fontWeight: '600', marginBottom: 4 },
  section: { fontWeight: '600', marginTop: 16, alignSelf: 'center' },
});
