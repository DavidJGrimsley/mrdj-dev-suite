/** The single authoring location for the opening handwriting sequence. Times are seconds. */
export const closingConfig = {
  quote: "Infinite intelligence will not build you a home and deliver that home to you, ready to enter; but infinite intelligence will open the way and provide the necessary means with which you may build your own house.",
  quoteSpeed: 10,
  signatureSpeed: 1,
  signaturePause: 2,
  endHold: 1,
  ink: "#ffffff",
  pen: { visible: true, length: 115, barrel: "#87613d", brass: "#dcb364", angle: 0.52 },
} as const;

export interface ClosingConfig {
  quote: string;
  quoteSpeed: number;
  signatureSpeed: number;
  signaturePause: number;
  endHold: number;
  ink: string;
  pen: { visible: boolean; length: number; barrel: string; brass: string; angle: number };
}
