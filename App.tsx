import React, { useState } from 'react';
import VideoGenerator from './components/VideoGenerator';
import LiveConversation from './components/LiveConversation';
import { VideoIcon, MicIcon } from './components/icons';

type Tab = 'video' | 'live';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('video');

  const renderContent = () => {
    switch (activeTab) {
      case 'video':
        return <VideoGenerator />;
      case 'live':
        return <LiveConversation />;
      default:
        return null;
    }
  };

  // FIX: Changed JSX.Element to React.ReactElement to resolve namespace error.
  const TabButton = ({ tab, label, icon }: { tab: Tab; label: string; icon: React.ReactElement }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center justify-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-blue-500 ${
        activeTab === tab
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Gemini Multimedia Suite
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Create, Animate, and Converse with the power of AI.
          </p>
        </header>

        <div className="bg-gray-800 p-2 rounded-xl shadow-2xl mb-8">
          <div className="grid grid-cols-2 gap-2">
            <TabButton tab="video" label="Video Generation" icon={<VideoIcon />} />
            <TabButton tab="live" label="Live Conversation" icon={<MicIcon />} />
          </div>
        </div>

        <main className="animate-fadeIn">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;