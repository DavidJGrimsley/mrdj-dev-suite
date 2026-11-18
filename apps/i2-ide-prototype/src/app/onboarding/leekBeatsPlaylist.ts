// LeekBeats default Home playlist. Append entries (any artist) to extend it.
export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

export const PLAYLIST_NAME = "i² Curated";

const base = import.meta.env.BASE_URL;

export const LEEKBEATS_TRACKS: readonly Track[] = [
  { id: "night-market", title: "Night Market", artist: "Leek Beats", src: `${base}assets/music/night-market.mp3` },
  { id: "lofi-midnight-club", title: "Lofi Midnight Club", artist: "alex-morgan", src: `${base}assets/music/alex-morgan-lofi-midnight-club.mp3` },
  { id: "tokyo-lofi", title: "Tokyo Lofi", artist: "ZephiraMusic", src: `${base}assets/music/zephiramusic-tokyo-lofi.mp3` },
  { id: "costco-dates", title: "Costco Dates", artist: "Leek Beats", src: `${base}assets/music/costco-dates.mp3` },
  { id: "lofi-relaxing", title: "Lofi Relaxing", artist: "VelarioMusic", src: `${base}assets/music/velariomusic-lofi-relaxing.mp3` },
  { id: "lofi-coffee-shop", title: "Lofi Coffee Shop", artist: "alex-morgan", src: `${base}assets/music/alex-morgan-lofi-coffee-shop.mp3` },
];
