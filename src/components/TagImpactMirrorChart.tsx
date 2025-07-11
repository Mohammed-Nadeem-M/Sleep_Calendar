 import React from 'react';
 import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
 import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
 import { useColours } from '../store/themeStore';

 /**
  * Impact values returned by computeImpacts() in StatisticsScreen.tsx
  *
  * dq : mean quality delta against average for the range
  * dd : mean duration delta against average for the range
  */
 export type Impact = {
   tag: string;
   dq: number;
   dd: number;
 };

 type Props = {
   /** Full list of impacts (positive & negative). */
   impacts: Impact[];
 };

 /**
  * Mirrored horizontal bar chart.
  *   • Top-5 positive tags on the left (green)
  *   • Top-5 negative tags on the right (red)
  *   • Each tag shows two bars:
  *       – quality impact (lighter shade)
  *       – duration impact (darker shade)
  *   • Bars grow outwards from the centre line.
  */
 export default function TagImpactMirrorChart({ impacts }: Props) {
   /* -------------------------------------------------------------------- */
   const { width: screenWidth } = useWindowDimensions();
   const chartWidth = screenWidth - 32; // leave a little horizontal padding
   const centreX = chartWidth / 2;
   const colours = useColours();

   /* Bar geometry */
   const barHeight = 10;
   const barGap = 6;
   const rowHeight = barHeight * 2 + barGap; // quality + duration + gap

   /* -------------------------------------------------------------------- */
   const pos = impacts
     .filter((i) => i.dq + i.dd > 0)
     .sort((a, b) => b.dq + b.dd - (a.dq + a.dd))
     .slice(0, 5);

   const neg = impacts
     .filter((i) => i.dq + i.dd < 0)
     .sort((a, b) => a.dq + a.dd - (b.dq + b.dd)) // ascending
     .slice(0, 5);

   const maxAbs = Math.max(
     1,
     ...[...pos, ...neg].flatMap((i) => [Math.abs(i.dq), Math.abs(i.dd)]),
   );

   // exaggerate: map largest value to 90 % of half-width, 5th ≈ 50 %
   const fullHalf = chartWidth * 0.5 * 0.9;

   const scale = (v: number) => (Math.abs(v) / maxAbs) * fullHalf;

   const rows   = Math.max(pos.length, neg.length);
   const axisY  = 20;               // y-coord of the horizontal axis / tick labels
   const svgHeight = axisY + rows * rowHeight;

   /* -------------------------------------------------------------------- */
   const palette = {
     posQual: '#81c784', // lighter green
     posDur:  '#4caf50', // darker green
     negQual: '#e57373', // lighter red
     negDur:  '#f44336', // darker red
   };

   const colourFor = (val: number, isQual: boolean) =>
     val >= 0
       ? isQual
         ? palette.posQual
         : palette.posDur
       : isQual
       ? palette.negQual
       : palette.negDur;

   /* -------------------------------------------------------------------- */
   return (
     <View style={styles.container}>
       <Text style={[styles.title, { color: colours.text }]}>
         Tag Impact of Most Popular Tags
       </Text>
       {/* Legend -------------------------------------------------------- */}
       <View style={styles.legendRow}>
         <View style={[styles.swatch, { backgroundColor: palette.posQual }]} />
         <Text style={[styles.legendLabel, { color: colours.text }]}>Quality +</Text>
         <View style={[styles.swatch, { backgroundColor: palette.negQual, marginLeft: 12 }]} />
         <Text style={[styles.legendLabel, { color: colours.text }]}>Quality -</Text>
         <View style={[styles.swatch, { backgroundColor: palette.posDur, marginLeft: 12 }]} />
         <Text style={[styles.legendLabel, { color: colours.text }]}>Duration +</Text>
         <View style={[styles.swatch, { backgroundColor: palette.negDur, marginLeft: 12 }]} />
         <Text style={[styles.legendLabel, { color: colours.text }]}>Duration -</Text>
       </View>

       <Svg width={chartWidth} height={svgHeight}>
         {/* centre axis */}
         <Line
           x1={centreX}
           x2={centreX}
           y1={axisY}
           y2={svgHeight}
           stroke="grey"
           strokeWidth={1}
         />

         {/* axis scale labels */}
         {[-fullHalf, -fullHalf / 2, 0, fullHalf / 2, fullHalf].map((dx, i) => {
           const x = centreX + dx;
           const val = (Math.abs(dx) / fullHalf) * maxAbs;
           const h = Math.floor(val);
           const m = Math.round((val - h) * 60);
           const hhmm = `${h}h${m ? m.toString().padStart(2, '0') + 'm' : ''}`;
           const label = `${val.toFixed(1)} (${hhmm})`;
           return (
             <SvgText
               key={`tick-${i}`}
               x={x}
               y={axisY - 6}
               fontSize="8"
               textAnchor="middle"
               fill={colours.text}
             >
               {label}
             </SvgText>
           );
         })}

         {/* Positive (left) ------------------------------------------------ */}
         {pos.map((it, idx) => {
           const y0 = axisY + 4 + idx * rowHeight;

           const qWidth = scale(it.dq);
           const dWidth = scale(it.dd);

           return (
             <React.Fragment key={`pos-${it.tag}`}>
               {/* quality (upper bar) */}
               <Rect
                 x={centreX - qWidth}
                 y={y0}
                 width={qWidth}
                 height={barHeight}
                 fill={colourFor(it.dq, true)}
               />
               {/* duration (lower bar) */}
               <Rect
                 x={centreX - dWidth}
                 y={y0 + barHeight}
                 width={dWidth}
                 height={barHeight}
                 fill={colourFor(it.dd, false)}
               />
               {/* tag label (to the left of bars) */}
               <SvgText
                 x={centreX - 6}
                 y={y0 + barHeight * 1.5}
                 fontSize="10"
                 textAnchor="end"
                 fill={colours.text}
               >
                 {it.tag}
               </SvgText>
             </React.Fragment>
           );
         })}

         {/* Negative (right) ---------------------------------------------- */}
         {neg.map((it, idx) => {
           const y0 = axisY + 4 + idx * rowHeight;

           const qWidth = scale(it.dq);
           const dWidth = scale(it.dd);

           return (
             <React.Fragment key={`neg-${it.tag}`}>
               {/* quality (upper bar) */}
               <Rect
                 x={centreX}
                 y={y0}
                 width={qWidth}
                 height={barHeight}
                 fill={colourFor(it.dq, true)}
               />
               {/* duration (lower bar) */}
               <Rect
                 x={centreX}
                 y={y0 + barHeight}
                 width={dWidth}
                 height={barHeight}
                 fill={colourFor(it.dd, false)}
               />
               {/* tag label (to the right of bars) */}
               <SvgText
                 x={centreX + 6}
                 y={y0 + barHeight * 1.5}
                 fontSize="10"
                 textAnchor="start"
                 fill={colours.text}
               >
                 {it.tag}
               </SvgText>
             </React.Fragment>
           );
         })}
       </Svg>
     </View>
   );
 }

 const styles = StyleSheet.create({
   container: {
     paddingHorizontal: 16,
   },
   legendRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 4,
     marginLeft: 16,
   },
   swatch: {
     width: 12,
     height: 12,
     borderRadius: 2,
   },
   legendLabel: {
     fontSize: 10,
     marginLeft: 4,
   },
   title: {
     fontSize: 14,
     fontWeight: '600',
     alignSelf: 'center',
     marginBottom: 4,
   },
 });
