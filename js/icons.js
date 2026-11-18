/* Cyanote icon system — hand-drawn SVG marks, no emoji.
   Geometry is copied verbatim from output/icons-preview.html (the source of
   truth); do not "tidy" the numbers here — the 744-grid clock and the 128-grid
   wave only line up because their viewBoxes are untouched.

   Notes that matter:
   - the outer <svg> in icon() has NO viewBox: each <symbol> carries its own,
     so 24 / 128 / 744 grids can sit side by side.
   - `.ico` never sets `color`. Monochrome marks inherit `currentColor`, so the
     CTA star turns white on hover and cyan in future-mode for free.
   - the wave is 31 gradients of inline `style="fill:url(#wvN);stroke:none"`.
     Never route it through currentColor and never add `path { fill: none }`.
   - the clock keeps its inline stroke-width:35.2 (744 grid, inner scale 1.32)
     = 1.50px at 24px. It deliberately ignores --sw. */

const SPRITE_NAMES = ['wave', 'clock', 'folder', 'tag', 'search', 'megaphone', 'link', 'alert', 'spark', 'bilibili', 'github', 'xhs'];

/** Display sizes used across the site. */
export const ICON_SIZES = { empty: 56, card: 24, widget: 16, cta: 20, note: 14 };

/** Stroke-width compensation, keyed to the *rendered* size (not the viewBox). */
export function swFor(size) {
  return size >= 32 ? 1.35 : size >= 20 ? 1.75 : size >= 15 ? 2.05 : 2.45;
}

/* One hidden sprite holds every symbol; each instance is a ~90 B <use>.
   `position:absolute;overflow:hidden` rather than `display:none`, which is
   more forgiving for gradients. Must live on <body>: a sprite in <head> makes
   <use> render blank. */
const SPRITE = `<svg id="cn-icons" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;overflow:hidden">
<symbol id="i-wave" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="wv1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.02063 -0.01965 -0.04374 -0.04593 -25.18137 105.95837)" cx="1911" cy="-676" r="1215" fx="1911" fy="-676" spreadMethod="pad"><stop offset="0" stop-color="#52C2FF"/><stop offset="1" stop-color="#52C2FF" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv2" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.03519 0.04926 -0.05161 -0.03687 -25.18137 105.95837)" cx="-1473" cy="-714" r="636" fx="-1473" fy="-714" spreadMethod="pad"><stop offset="0.81262" stop-color="#5CC8FF" stop-opacity="0"/><stop offset="1" stop-color="#5CC8FF"/></radialGradient>
    <linearGradient id="wv3" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.06343 0 0 -0.06343 -25.18137 105.95837)" x1="1406" y1="1646" x2="1406" y2="-323" spreadMethod="pad"><stop offset="0" stop-color="#52C3FB"/><stop offset="1" stop-color="#3E7FF0"/></linearGradient>
    <linearGradient id="wv4" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.06343 0 0 -0.06343 -25.18137 105.95837)" x1="1406" y1="1708" x2="1406" y2="750" spreadMethod="pad"><stop offset="0" stop-color="#53C2F9"/><stop offset="1" stop-color="#53C2F9" stop-opacity="0"/></linearGradient>
    <linearGradient id="wv5" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.06343 0 0 -0.06343 -25.18137 105.95837)" x1="1497" y1="-323" x2="1497" y2="-257" spreadMethod="pad"><stop offset="0" stop-color="#2E6DEA"/><stop offset="1" stop-color="#2E6DEA" stop-opacity="0"/></linearGradient>
    <radialGradient id="wv6" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.03783 0.04521 0.04865 -0.0407 -25.18137 105.95837)" cx="648" cy="1564" r="2477" fx="648" fy="1564" spreadMethod="pad"><stop offset="0.50153" stop-color="#2E6DEA" stop-opacity="0"/><stop offset="0.65155" stop-color="#2E6DEA"/></radialGradient>
    <radialGradient id="wv7" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.03223 0.03852 0.04865 -0.0407 -25.18137 105.95837)" cx="749" cy="1666" r="2907" fx="749" fy="1666" spreadMethod="pad"><stop offset="0.19122" stop-color="#2E6DEA"/><stop offset="0.24231" stop-color="#2E6DEA" stop-opacity="0"/></radialGradient>
    <linearGradient id="wv8" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.06343 0 0 -0.06343 -25.18137 105.95837)" x1="289" y1="-71" x2="2415" y2="-71" spreadMethod="pad"><stop offset="0" stop-color="#2E6DEA"/><stop offset="0.076294" stop-color="#2E6DEA" stop-opacity="0"/></linearGradient>
    <radialGradient id="wv9" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.03226 0.03429 0.0462 -0.04346 -25.18137 105.95837)" cx="208" cy="1556" r="540" fx="208" fy="1556" spreadMethod="pad"><stop offset="0.32971" stop-color="#40A3EE"/><stop offset="1" stop-color="#40A3EE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv10" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.01097 0.01725 -0.05351 -0.03405 -25.18137 105.95837)" cx="-6394" cy="-484" r="1458" fx="-6394" fy="-484" spreadMethod="pad"><stop offset="0" stop-color="#6AD5FD"/><stop offset="0.26691" stop-color="#6AD5FD" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv11" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.05079 0.03799 -0.03799 -0.05079 -25.18137 105.95837)" cx="-2550" cy="-381" r="119" fx="-2550" fy="-381" spreadMethod="pad"><stop offset="0" stop-color="#BFF7FF"/><stop offset="1" stop-color="#8FD9FE"/></radialGradient>
    <radialGradient id="wv12" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0 0.06343 0.06343 0 -25.18137 105.95837)" cx="-1215" cy="2228" r="104" fx="-1215" fy="2228" spreadMethod="pad"><stop offset="0.73779" stop-color="#85CCF6" stop-opacity="0"/><stop offset="1" stop-color="#85CCF6"/></radialGradient>
    <radialGradient id="wv13" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.04554 0.04415 -0.04415 -0.04554 -25.18137 132.64771)" cx="-2490" cy="-687" r="128" fx="-2490" fy="-687" spreadMethod="pad"><stop offset="0" stop-color="#BFF4FF"/><stop offset="1" stop-color="#90D0F8"/></radialGradient>
    <radialGradient id="wv14" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.03634 0.05198 -0.05198 -0.03634 -25.18137 132.64771)" cx="-2309" cy="-1149" r="140" fx="-2309" fy="-1149" spreadMethod="pad"><stop offset="0.73779" stop-color="#85CCF6" stop-opacity="0"/><stop offset="1" stop-color="#85CCF6"/></radialGradient>
    <radialGradient id="wv15" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.04131 0.02987 -0.03717 -0.0514 -70.33562 128.81208)" cx="-3165" cy="-349" r="143" fx="-3165" fy="-349" spreadMethod="pad"><stop offset="0" stop-color="#A8DDFF"/><stop offset="1" stop-color="#8AC7FB"/></radialGradient>
    <radialGradient id="wv16" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.04686 0.04275 -0.04212 -0.04617 -56.58406 90.98161)" cx="-2489" cy="-630" r="110" fx="-2489" fy="-630" spreadMethod="pad"><stop offset="0" stop-color="#BAF7FF"/><stop offset="1" stop-color="#85DEFB"/></radialGradient>
    <radialGradient id="wv17" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.06343 0 0 -0.04506 -25.18137 105.95837)" cx="-1891" cy="1639" r="846" fx="-1891" fy="1639" spreadMethod="pad"><stop offset="0.71863" stop-color="#86CCEE" stop-opacity="0"/><stop offset="1" stop-color="#86CCEE"/></radialGradient>
    <radialGradient id="wv18" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.01305 -0.06207 0.02917 -0.00613 -25.18137 105.95837)" cx="365" cy="3556" r="580" fx="365" fy="3556" spreadMethod="pad"><stop offset="0" stop-color="#86CCEE"/><stop offset="0.99127" stop-color="#86CCEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv19" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.023 -0.05911 0.02778 -0.01081 -25.18137 105.95837)" cx="41" cy="4501" r="491" fx="41" fy="4501" spreadMethod="pad"><stop offset="0" stop-color="#86CCEE"/><stop offset="0.99127" stop-color="#86CCEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv20" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.05534 0.03099 -0.03063 -0.0547 -25.18137 105.95837)" cx="-1769" cy="420" r="185" fx="-1769" fy="420" spreadMethod="pad"><stop offset="0.19427" stop-color="#BBF4FF"/><stop offset="1" stop-color="#BBF4FF" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv21" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.05985 0.02101 -0.02077 -0.05916 -25.18137 105.95837)" cx="-1971" cy="608" r="168" fx="-1971" fy="608" spreadMethod="pad"><stop offset="0.19427" stop-color="#BBF4FF"/><stop offset="1" stop-color="#BBF4FF" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv22" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.05549 0.02932 -0.02963 -0.05608 -25.18137 105.95837)" cx="-2400" cy="178" r="222" fx="-2400" fy="178" spreadMethod="pad"><stop offset="0" stop-color="#BBF4FF"/><stop offset="1" stop-color="#BBF4FF" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv23" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.04564 0.03717 -0.04005 -0.04919 -25.18137 105.95837)" cx="-2650" cy="-288" r="282" fx="-2650" fy="-288" spreadMethod="pad"><stop offset="0" stop-color="#C3FDFF"/><stop offset="1" stop-color="#C3FDFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv24" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.007 -0.06304 0.03575 -0.00397 -25.18137 105.95837)" cx="558" cy="3244" r="326" fx="558" fy="3244" spreadMethod="pad"><stop offset="0.74316" stop-color="#75BAEE"/><stop offset="1" stop-color="#75BAEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv25" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.01743 -0.06099 0.02492 -0.00712 -25.18137 105.95837)" cx="991" cy="5006" r="262" fx="991" fy="5006" spreadMethod="pad"><stop offset="0.74316" stop-color="#75BAEE"/><stop offset="1" stop-color="#75BAEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv26" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.05161 0.03687 0.03687 -0.05161 -25.18137 105.95837)" cx="557" cy="1329" r="310" fx="557" fy="1329" spreadMethod="pad"><stop offset="0.55469" stop-color="#75BAEE"/><stop offset="1" stop-color="#75BAEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv27" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.06324 0.00487 -0.00487 -0.06324 -25.18137 105.95837)" cx="-1988" cy="463" r="470" fx="-1988" fy="463" spreadMethod="pad"><stop offset="0.55469" stop-color="#75BAEE"/><stop offset="1" stop-color="#75BAEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv28" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.02006 0.06017 -0.01818 -0.00606 -25.18137 105.95837)" cx="-1187" cy="-3472" r="342" fx="-1187" fy="-3472" spreadMethod="pad"><stop offset="0.40417" stop-color="#75BAEE"/><stop offset="1" stop-color="#75BAEE" stop-opacity="0"/></radialGradient>
    <radialGradient id="wv29" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.0583 -0.02499 0.02499 -0.0583 -25.18137 105.95837)" cx="-1335" cy="1828" r="1921" fx="-1335" fy="1828" spreadMethod="pad"><stop offset="0.40417" stop-color="#75BAEE" stop-opacity="0"/><stop offset="0.46198" stop-color="#75BAEE"/></radialGradient>
    <radialGradient id="wv30" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0.03788 -0.05087 -0.05087 -0.03788 -25.18137 105.95837)" cx="1701" cy="-352" r="2112" fx="1701" fy="-352" spreadMethod="pad"><stop offset="0.36096" stop-color="#75BAEE" stop-opacity="0"/><stop offset="0.43463" stop-color="#75BAEE"/></radialGradient>
    <radialGradient id="wv31" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.03558 0.03956 -0.04716 -0.04242 -38.44833 119.30304)" cx="-2912" cy="-867" r="183" fx="-2912" fy="-867" spreadMethod="pad"><stop offset="0.14325" stop-color="#BDF3FF"/><stop offset="1" stop-color="#83C5F7"/></radialGradient>
  </defs>
    <path style="fill:#49B9FF;stroke:none" d="M74 27.75Q74 27.75 74 27.75Q65 27.75 57.5 32.25Q50 36.75 45.5 44.25Q41 51.5 41 60.5Q41 67.5 43.75 73.5Q46.25 79.75 51 84.25Q55.75 89 61.75 91.75Q67.75 94.5 74.5 94.5Q80.75 94.5 86.5 93.75Q92.5 93 98.5 90.25Q104.5 87.5 110.75 81.75L107.5 111.75H20.5V16.25H74Z"/>
    <path style="fill:url(#wv1);stroke:none" d="M74 27.75Q74 27.75 74 27.75Q65 27.75 57.5 32.25Q50 36.75 45.5 44.25Q41 51.5 41 60.5Q41 67.5 43.75 73.5Q46.25 79.75 51 84.25Q55.75 89 61.75 91.75Q67.75 94.5 74.5 94.5Q80.75 94.5 86.5 93.75Q92.5 93 98.5 90.25Q104.5 87.5 110.75 81.75L107.5 111.75H20.5V16.25H74Z"/>
    <path style="fill:url(#wv2);stroke:none" d="M74 27.75Q74 27.75 74 27.75Q65 27.75 57.5 32.25Q50 36.75 45.5 44.25Q41 51.5 41 60.5Q41 67.5 43.75 73.5Q46.25 79.75 51 84.25Q55.75 89 61.75 91.75Q67.75 94.5 74.5 94.5Q80.75 94.5 86.5 93.75Q92.5 93 98.5 90.25Q104.5 87.5 110.75 81.75L107.5 111.75H20.5V16.25H74Z"/>
    <path style="fill:url(#wv3);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv4);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv5);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv6);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv7);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv8);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv9);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv10);stroke:none" d="M0 58.5Q0 47 4.5 36.75Q9 26.25 16.5 18.5Q24 10.5 33.25 6Q42.5 1.5 52.25 1.5Q62.75 1.5 70.5 4.25Q78.25 7 83.5 11.25Q89 15.5 92 20Q95.25 24.25 96.25 27.5V32H77.25L71.75 24.5Q71 24 69 23.25Q67.25 22.75 63.25 22.75Q58.5 22.75 52.25 25Q45.75 27.25 40 32Q34.25 36.75 30.5 44.25Q26.5 51.5 26.5 62Q26.5 70.5 30.25 77.75Q34 85.25 40.25 90.75Q46.5 96.25 54 99.25Q61.25 102.25 68.5 102.25Q79.5 102.25 87.25 98.75Q95 95 101 90Q105.25 86.5 109.25 83Q113.25 79.25 117.75 76.25Q122.25 73 128 71V126.5H0Z"/>
    <path style="fill:url(#wv11);stroke:none" d="M121.25 30.25Q121.5 27.25 118.75 25.5Q116.25 24 113.5 25.5Q110.75 27.25 111 30.25Q110.75 33.25 113.5 35Q116.25 36.5 118.75 35Q121.5 33.25 121.25 30.25Z"/>
    <path style="fill:url(#wv12);stroke:none" d="M121.25 30.25Q121.5 27.25 118.75 25.5Q116.25 24 113.5 25.5Q110.75 27.25 111 30.25Q110.75 33.25 113.5 35Q116.25 36.5 118.75 35Q121.5 33.25 121.25 30.25Z"/>
    <path style="fill:url(#wv13);stroke:none" d="M121.25 57Q121.5 53.75 118.75 52.25Q116.25 50.75 113.5 52.25Q110.75 53.75 111 57Q110.75 60 113.5 61.5Q116.25 63.25 118.75 61.5Q121.5 60 121.25 57Z"/>
    <path style="fill:url(#wv14);stroke:none" d="M121.25 57Q121.5 53.75 118.75 52.25Q116.25 50.75 113.5 52.25Q110.75 53.75 111 57Q110.75 60 113.5 61.5Q116.25 63.25 118.75 61.5Q121.5 60 121.25 57Z"/>
    <path style="fill:url(#wv15);stroke:none" d="M76.25 53Q76.25 50 73.75 48.5Q71 47 68.25 48.5Q65.75 50 65.75 53Q65.75 56.25 68.25 57.75Q71 59.25 73.75 57.75Q76.25 56.25 76.25 53Z"/>
    <path style="fill:url(#wv16);stroke:none" d="M90 15.25Q90 12.25 87.5 10.5Q84.75 9 82 10.5Q79.5 12.25 79.5 15.25Q79.5 18.25 82 20Q84.75 21.5 87.5 20Q90 18.25 90 15.25Z"/>
    <path style="fill:#A1E5FF;stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv17);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv18);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv19);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv20);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv21);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv22);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv23);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv24);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv25);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv26);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv27);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv28);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv29);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv30);stroke:none" d="M65.75 40Q69.5 44.25 75 44.25Q78.25 44.25 80.75 42.75Q83.5 41.25 85 39Q86.75 41.25 89.5 42.75Q92 44.25 95.25 44.25Q100.25 44.25 103.75 40.75Q107.25 37.25 107.25 32Q107.25 27 103.75 23.5Q100.25 20 95.25 20Q92 20 89.5 21.5Q86.75 22.75 85 25.25Q83.5 22.75 80.75 21.5Q78.25 20 75 20Q72.25 20 70 21Q67.5 22.25 65.75 24.25Q64.25 22.25 61.75 21Q59.5 20 56.75 20Q51.75 20 48 23.5Q44.5 27 44.5 32Q44.5 37.25 48 40.75Q51.75 44.25 56.75 44.25Q59.5 44.25 61.75 43Q64.25 42 65.75 40Z"/>
    <path style="fill:url(#wv31);stroke:none" d="M108 43.5Q108.25 40.5 105.5 39Q102.75 37.5 100.25 39Q97.5 40.5 97.75 43.5Q97.5 46.75 100.25 48.25Q102.75 49.75 105.5 48.25Q108.25 46.75 108 43.5Z"/>
</symbol>
<symbol id="i-clock" viewBox="0 0 744 744">
    <g style="fill:none;stroke-width:35.2;stroke-linecap:round;stroke-linejoin:round">
      <g transform="translate(372 372) scale(1.32) translate(-272.35 -352.25)">
        <path style="stroke:var(--ck-hand,#51C0F9)" d="M 238.73 284.84L 370.57 370.46L 370.57 580"/>
        <g style="stroke:var(--ck-arc,#3F83F0)">
          <path d="M 409.87 438.53A 78.6 78.6 0 0 1 331.27 302.39"/>
          <path d="M 449.17 506.6A 157.2 157.2 0 0 1 291.97 506.6"/>
          <path d="M 488.47 574.67A 235.8 235.8 0 0 1 166.36 252.56"/>
          <path d="M 203.83 203.72A 235.8 235.8 0 0 1 252.67 166.25"/>
          <path d="M 148.26 592.77A 314.4 314.4 0 0 1 66.88 451.83"/>
          <path d="M 56.17 370.46A 314.4 314.4 0 0 1 80.1 250.14"/>
          <path d="M 121.14 179.07A 314.4 314.4 0 0 1 213.37 98.18"/>
        </g>
      </g>
    </g>
  </symbol>
<symbol id="i-folder" viewBox="0 0 24 24">
    <path d="M3 7.9a2.1 2.1 0 0 1 2.1-2.1h3.3l2.1 2.5h8.4A2.1 2.1 0 0 1 21 10.4v8.5a2.1 2.1 0 0 1-2.1 2.1H5.1A2.1 2.1 0 0 1 3 18.9z"/>
    <path class="ico-l" style="--lw:.78;--lo:.5" d="M3 12.1h18"/>
  </symbol>
<symbol id="i-tag" viewBox="0 0 24 24">
    <g transform="translate(9.98 13.61) rotate(45)">
      <path d="M-4.87 -3.11 V-7.04 A1.22 1.22 0 0 1 -3.66 -8.26 H6.77 L10.02 -5.15 L6.77 -2.03 L5.80 -2.03"/>
      <path d="M-5.82 -3.11 H4.60 L7.85 0 L4.60 3.11 H-5.82 A1.22 1.22 0 0 1 -7.04 1.90 V-1.90 A1.22 1.22 0 0 1 -5.82 -3.11 Z"/>
      <circle cx="-4.33" cy="0" r=".95" fill="currentColor" stroke="none"/>
    </g>
  </symbol>
<symbol id="i-search" viewBox="0 0 24 24">
    <circle cx="10.6" cy="10.6" r="6.9"/>
    <path d="M15.6 15.6l4.4 4.4"/>
    <path class="ico-l" style="--lw:.72;--lo:.55" d="M7.5 11.4q1.55-2 3.1 0t3.1 0"/>
  </symbol>
<symbol id="i-megaphone" viewBox="0 0 24 24">
    <path d="M3.2 9.6h3.6l7.4-4.4v13.6l-7.4-4.4H3.2z"/>
    <path class="ico-l" style="--lw:.88;--lo:.72" d="M17.6 9.4q1.2 2.6 0 5.2"/>
    <path class="ico-l" style="--lw:.88;--lo:.45" d="M20.4 7.7q2 4.3 0 8.6"/>
  </symbol>
<symbol id="i-link" viewBox="0 0 24 24">
    <path d="M10.15 12.93 A4.625 4.625 0 0 0 17.12 13.42 L19.90 10.65 A4.625 4.625 0 0 0 13.36 4.11 L11.77 5.69"/>
    <path d="M13.85 11.07 A4.625 4.625 0 0 0 6.88 10.58 L4.10 13.35 A4.625 4.625 0 0 0 10.64 19.89 L12.23 18.31"/>
  </symbol>
<symbol id="i-alert" viewBox="0 0 24 24">
    <path d="M12 3.7a1.7 1.7 0 0 1 1.5.9l7.4 12.9a1.7 1.7 0 0 1-1.5 2.5H4.6a1.7 1.7 0 0 1-1.5-2.5l7.4-12.9A1.7 1.7 0 0 1 12 3.7z"/>
    <path d="M12 9.4v3.9"/>
    <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>
  </symbol>
<symbol id="i-spark" viewBox="0 0 24 24">
    <path fill="currentColor" stroke="none" d="M8.8 1.6C9.45 6.8 11.35 8.7 16.4 9.35 11.35 10 9.45 11.9 8.8 17.1 8.15 11.9 6.25 10 1.2 9.35 6.25 8.7 8.15 6.8 8.8 1.6Z"/>
    <path fill="currentColor" stroke="none" opacity=".85" d="M18.9 13.1C19.2 15.9 20.1 16.8 22.9 17.1 20.1 17.4 19.2 18.3 18.9 21.1 18.6 18.3 17.7 17.4 14.9 17.1 17.7 16.8 18.6 15.9 18.9 13.1Z"/>
  </symbol>
<symbol id="i-bilibili" viewBox="0 0 24 24">
    <path d="M7.2 5.5 4.5 2.8M16.8 5.5l2.7-2.7"/>
    <rect x="2.6" y="5.5" width="18.8" height="14.1" rx="3.5"/>
    <path d="M8.5 10.6v3.5M15.5 10.6v3.5"/>
  </symbol>
<symbol id="i-github" viewBox="0 0 16 16">
    <path fill="currentColor" stroke="none" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
  </symbol>
<symbol id="i-xhs" viewBox="0 0 24 24">
    <rect x="3.6" y="3.2" width="16.8" height="17.6" rx="3.2"/>
    <path class="ico-l" style="--lw:.8;--lo:.55" d="M7.2 3.2v17.6"/>
    <path d="M15.9 9.1c-1.05-1.1-2.85-.78-3.32.62-.47-1.4-2.27-1.72-3.32-.62-.92 1.03-.6 2.53.38 3.5L12.58 15.5l2.94-2.9c.98-.97 1.3-2.47.38-3.5Z"/>
  </symbol>
</svg>`;

/** Idempotent: safe to call from every module that imports this file. */
export function mountIcons() {
  if (document.getElementById('cn-icons')) return;
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
}

/** Inline SVG markup for `name` at `size` px. Returns '' for unknown names so a
    typo can never blank out a whole page. */
export function icon(name, size = 24, cls = '') {
  if (!SPRITE_NAMES.includes(name)) {
    console.warn('[icons] unknown icon:', name);
    return '';
  }
  return (
    `<svg class="ico${cls ? ' ' + cls : ''}" style="--s:${size}px;--sw:${swFor(size)}"` +
    ` aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`
  );
}

mountIcons();
