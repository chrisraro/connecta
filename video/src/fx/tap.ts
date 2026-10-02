/** Tap staging, in px of the 888 × 1300 stage that Tap, Profile and Leads share. */
export const TAP = {
  /** Scene-relative frame the card meets the phone; the tap beat starts at 90, so 150 is on the 15-frame grid. */
  contactFrame: 60,
  /** The phone as drawn: 300 px natural width scaled 1.9x, left 159, top 0. */
  phone: { x: 159, y: 0, width: 578, height: 1210 },
  /** Where the card touches the phone's back: top third, right of centre, by the camera. */
  contact: { x: 600, y: 80 },
  /** The card at rest: its lower part is behind the phone, its upper part above it. */
  card: { x: 340, y: -180, width: 540, height: 340 },
} as const;
