export interface IllustrationPalette {
  ink?: string;
  paper?: string;
  clay?: string;
  sage?: string;
  sun?: string;
  plum?: string;
}

export interface IllustrationProps {
  size?: number;
  palette?: IllustrationPalette;
  className?: string;
}

export const defaultPalette: Required<IllustrationPalette> = {
  ink:   "#1A1815",
  paper: "#F4ECDC",
  clay:  "#DC4F2C",
  sage:  "#6F7A5E",
  sun:   "#E5B14C",
  plum:  "#6B3F4D",
};
