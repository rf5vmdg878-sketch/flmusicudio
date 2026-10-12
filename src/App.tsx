import { useState } from 'react';
import { TopBar } from '@/components/TopBar/TopBar';
import { ChannelRack } from '@/components/ChannelRack/ChannelRack';
import { PianoRoll } from '@/components/PianoRoll/PianoRoll';
import { Playlist } from '@/components/Playlist/Playlist';
import { Mixer } from '@/components/Mixer/Mixer';

type Tab = 'rack' | 'piano' | 'playlist' | 'mixer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'rack', label: 'Step Sequencer' },
  { id: 'piano', label: 'Piano Roll' },
  { id: 'playlist', label: 'Playlist' },
  { id: 'mixer', label: 'Mixer' },
];

export default function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('rack');

  return (
    <div className="app">
      <TopBar />
      <div className="app-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`app-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="app-main">
        {tab === 'rack' && <ChannelRack />}
        {tab === 'piano' && <PianoRoll />}
        {tab === 'playlist' && <Playlist />}
        {tab === 'mixer' && <Mixer />}
      </div>
    </div>
  );
}
