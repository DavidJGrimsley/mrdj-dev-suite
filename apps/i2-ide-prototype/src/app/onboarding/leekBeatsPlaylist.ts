// LeekBeats default Home playlist. Append entries (any artist) to extend it.
export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

export const PLAYLIST_NAME = "LeekBeats";

const base = import.meta.env.BASE_URL;

export const LEEKBEATS_TRACKS: readonly Track[] = [
  { id: "night-market", title: "Night Market", artist: "Leek Beats", src: `${base}assets/music/night-market.mp3` },
  { id: "costco-dates", title: "Costco Dates", artist: "Leek Beats", src: `${base}assets/music/costco-dates.mp3` },
];
