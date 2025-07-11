import React, { useMemo, useState} from 'react';
import {
  Modal,
  View,
  FlatList,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
  useSleepStore,
  durationHours,
  SleepLog,
} from '../store/sleepStore';
import { impactColour, formatDurationDelta } from '../utils/format';
import SleepLogCard from '../components/SleepLogCard';
import AddSleepModal from './AddSleepModal';
import Fab from '../components/Fab';
import { LineChart } from 'react-native-chart-kit';
import { useColours } from '../store/themeStore';


/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/*                               Helper colours                               */
/* -------------------------------------------------------------------------- */
const qualityColor = (q?: number): string => {
  if (q === undefined) return '#9e9e9e'; // grey – no quality set
  if (q <= 3) return '#e53935'; // red
  if (q <= 6) return '#fdd835'; // yellow
  return '#43a047'; // green (7 and above)
};

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}


/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */
export default function CalendarScreen() {
  const logs = useSleepStore((s) => s.logs);
  const colours = useColours();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editLog, setEditLog] = useState<SleepLog | null>(null);
  const [addDefaults, setAddDefaults] = useState<Partial<SleepLog> | null>(
    null,
  );

  /* ---------------------------- marked dates ---------------------------- */
  const markedDates = useMemo(() => {
    const map: Record<string, any> = {};

    logs.forEach((log) => {
      const date = log.start.slice(0, 10); // YYYY-MM-DD
      map[date] = {
        customStyles: {
          container: {
            backgroundColor: qualityColor(log.quality),
            borderRadius: 4,
          },
          text: { color: '#fff' },
        },
      };
    });

    if (selectedDate) {
      map[selectedDate] = {
        ...(map[selectedDate] ?? {}),
        selected: true,
        selectedColor: '#2196f3',
      };
    }

    return map;
  }, [logs, selectedDate]);

  /* ----------------------------- callbacks ------------------------------ */
  const handleDayPress = (day: DateData) => setSelectedDate(day.dateString);

  /* ---------------------------- monthly data --------------------------- */
  const monthLogs = useMemo(
    () =>
      logs.filter((l) => {
        const d = new Date(l.start);
        return (
          d.getFullYear() === currentMonth.getFullYear() &&
          d.getMonth() === currentMonth.getMonth()
        );
      }),
    [logs, currentMonth],
  );

  const durations = monthLogs
    .map(durationHours)
    .filter((n): n is number => n !== null);
  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  const qualities = monthLogs
    .map((l) => l.quality)
    .filter((q): q is number => q !== undefined);
  const avgQuality =
    qualities.length > 0
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length
      : 0;

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const dailyDuration = Array(daysInMonth).fill(0);
  const dailyQuality = Array(daysInMonth).fill(0);

  monthLogs.forEach((log) => {
    const d = new Date(log.start);
    const idx = d.getDate() - 1;
    const dur = durationHours(log);
    if (dur !== null) dailyDuration[idx] = dur;
    if (log.quality !== undefined) dailyQuality[idx] = log.quality;
  });

  const labels = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    if (d === 1 || d === daysInMonth) return String(d);
    return d % 5 === 1 && d < daysInMonth - 4 ? String(d) : '';
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: dailyDuration,
        color: () => '#2196f3',
        strokeWidth: 2,
      },
      {
        data: dailyQuality,
        color: () => '#fdd835',
        strokeWidth: 2,
      },
    ],
  };

  const chartWidth = Dimensions.get('window').width - 24;

  const renderSummary = () => (
    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
      <LineChart data={chartData} width={chartWidth + 16} height={160} withDots={false} withInnerLines={false} withHorizontalLabels={true} withVerticalLabels={true} chartConfig={{backgroundColor:colours.background,backgroundGradientFrom:colours.background,backgroundGradientTo:colours.background,decimalPlaces:1,color:(o=1)=>`rgba(33,150,243,${o})`,labelColor:()=>colours.text,paddingRight:8}} style={{ marginVertical: 8, marginLeft: -24 }} />
      <View style={{flexDirection:'row',alignItems:'center',marginTop:4}}>
        <View style={{width:12,height:12,backgroundColor:'#2196f3',marginRight:4}}/>
        <Text style={{ marginRight:12, fontSize:12, color: colours.text }}>Duration (h)</Text>
        <View style={{width:12,height:12,backgroundColor:'#fdd835',marginRight:4}}/>
        <Text style={{ fontSize:12, color: colours.text }}>Quality /10</Text>
      </View>
      {(() => {
        const tagCounts: Record<string, number> = {};
        monthLogs.forEach((l) =>
          l.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)),
        );
        const top = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        const avg = (arr: SleepLog[], f: (l: SleepLog) => number) =>
          arr.length ? arr.reduce((s, l) => s + f(l), 0) / arr.length : 0;
        return top.map(([tag]) => {
          const withT = logs.filter((l) => l.tags.includes(tag));
          const withoutT = logs.filter((l) => !l.tags.includes(tag));
          const dqNum = avg(withT, (l) => l.quality ?? 0) -
            avg(withoutT, (l) => l.quality ?? 0);
          const ddNum = avg(withT, (l) => durationHours(l) || 0) -
            avg(withoutT, (l) => durationHours(l) || 0);

          return (
            <Text key={tag} style={{ fontSize: 12, marginTop: 2, color: colours.text }}>
              {tag} ({tagCounts[tag]}): Quality{' '}
              <Text style={{ color: impactColour(dqNum) }}>
                {dqNum > 0 ? '+' : ''}{dqNum.toFixed(1)}
              </Text>{' '}
              / Duration{' '}
              <Text style={{ color: impactColour(ddNum) }}>
                {formatDurationDelta(ddNum)}
              </Text>
            </Text>
          );
        });
      })()}
      <Text style={[styles.summaryText, { marginTop: 6, color: colours.text }]}>
        Avg duration {avgDuration.toFixed(1)} h / Avg quality{' '}
        {avgQuality.toFixed(1)}/10
      </Text>
    </View>
  );

  const dayLogs = logs.filter(
    (l) => selectedDate && l.start.slice(0, 10) === selectedDate,
  );

  /* ---------------------------- FAB add ------------------------------- */
  const handleFabPress = () => {
    const base = selectedDate
      ? new Date(selectedDate)
      : new Date(Date.now() - 86_400_000);
    base.setHours(0, 0, 0, 0);
    const startDate = new Date(base);
    const endDate = selectedDate
      ? new Date(base.getTime() + 86_400_000)
      : new Date();

    setAddDefaults({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      tags: [],
    });
  };

  /* ------------------------------- render ------------------------------- */
  return (
    <View style={{ flex: 1, backgroundColor: colours.background }}>
      {/* Month header ---------------------------------------------------- */}
      <View style={styles.monthHeader}>
        <Text style={styles.monthLabel}></Text>
      </View>

      {/* Calendar -------------------------------------------------------- */}
      <Calendar
        key={`${colours.background}-${colours.text}`}
        current={toDateString(currentMonth)}
        markingType="custom"
        markedDates={markedDates}
        hideArrows={false}
        style={{ height: 340, marginBottom: 8 }}
        theme={{
          backgroundColor: colours.background,
          calendarBackground: colours.background,
          dayTextColor: colours.text,
          monthTextColor: colours.text,
          textSectionTitleColor: colours.text,
          arrowColor: colours.text,
          selectedDayBackgroundColor: '#2196f3',
          selectedDayTextColor: '#fff',
        }}
        onDayPress={handleDayPress}
        onMonthChange={({ year, month }) =>
          setCurrentMonth(new Date(year, month - 1, 1))
        }
      />



      {/* Logs list ------------------------------------------------------- */}
      <FlatList
        style={{ flex: 1, marginTop: 4, paddingTop: 4 }}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        data={monthLogs}
        ListHeaderComponent={renderSummary}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setEditLog(item)}>
            <SleepLogCard log={item} />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
      />

      {/* Daily modal ----------------------------------------------------- */}
      <Modal
        visible={!!selectedDate}
        animationType="slide"
        onRequestClose={() => setSelectedDate(null)}
      >
        <View style={{ flex: 1, backgroundColor: colours.background }}>
          <View style={[styles.modalHeader, { backgroundColor: colours.background, borderBottomColor: colours.text }]}>
            <Text style={[styles.modalTitle, { color: colours.text }]}>{selectedDate}</Text>
            <Button title="Close" onPress={() => setSelectedDate(null)} />
          </View>

          {dayLogs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colours.background }]}>
              <Text style={{ color: colours.text }}>No logs for this date.</Text>
            </View>
          ) : (
            <FlatList
              data={dayLogs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setEditLog(item)}>
                  <SleepLogCard log={item} />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ padding: 12 }}
            />
          )}
        </View>
      </Modal>

      {/* Edit/Add modal -------------------------------------------------- */}
      <AddSleepModal
        visible={!!editLog || !!addDefaults}
        defaultValues={editLog ?? addDefaults ?? {}}
        onClose={() => {
          setEditLog(null);
          setAddDefaults(null);
        }}
      />
      <Fab onPress={handleFabPress} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryText: {
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
