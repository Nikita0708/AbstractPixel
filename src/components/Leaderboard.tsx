import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { Card, CardHeader } from "@heroui/react";
import { CardContent, CardTitle } from "./ui/card";

const Leaderboard = ({ walletAddress, socket }: any) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();

    socket.on("leaderboardUpdate", (updatedLeaderboard: any) => {
      setLeaderboard(updatedLeaderboard);
      if (walletAddress) {
        const currentUser = updatedLeaderboard.find(
          (user: any) =>
            user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
        if (currentUser) {
          setUserStats(currentUser);
        }
      }
    });

    return () => {
      socket.off("leaderboardUpdate");
    };
  }, [socket]);

  useEffect(() => {
    if (walletAddress) {
      fetchUserStats();
    }
  }, [walletAddress]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(
        "https://abstract-backend.onrender.com/leaderboard"
      );
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch(
        `https://abstract-backend.onrender.com/user/${walletAddress}`
      );
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
    }
  };

  const getRankColor = (index: any) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className="w-[1232px] mt-[100px] pt-3">
      <CardHeader className="pb-4 ">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {userStats && (
          <div className=" p-4 rounded-lg mb-4">
            <h3 className="font-bold text-lg mb-2">Your Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Points</p>
                <p className="font-bold text-lg">{userStats.points}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pixels Painted</p>
                <p className="font-bold text-lg">{userStats.pixelsPainted}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {leaderboard.map((user, index) => (
            <div
              key={user.walletAddress}
              className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                user.walletAddress.toLowerCase() ===
                walletAddress?.toLowerCase()
                  ? "bg-green-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg ${getRankColor(index)}`}>
                  {index + 1}
                </span>
                <div>
                  <div className="font-mono text-sm">
                    {user.walletAddress.slice(0, 6)}...
                    {user.walletAddress.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.pixelsPainted} pixels
                  </div>
                </div>
              </div>
              <div className="text-right font-bold">{user.points} pts</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
