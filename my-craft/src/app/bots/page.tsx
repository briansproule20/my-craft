import BotDashboard from '@/components/minecraft/bot-dashboard';
import ServerConfig from '@/components/minecraft/server-config';
import ActivityLog from '@/components/minecraft/activity-log';

export default function BotsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BotDashboard />
        <ServerConfig />
      </div>

      <ActivityLog />
    </div>
  );
}