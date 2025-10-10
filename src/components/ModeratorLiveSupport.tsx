import React, { useState, useEffect } from "react";
import { useLiveSupport, SupportSession } from "@/context/LiveSupportContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import LiveSupportChat from "./LiveSupportChat";
import { toast } from "@/hooks/use-toast";
import { Archive, Bell, Shield } from "lucide-react";
import ArchivedSupportSessions from "./ArchivedSupportSessions";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * This component must always be used inside <LiveSupportProvider>
 * Example:
 * <LiveSupportProvider>
 *   <ModeratorLiveSupport />
 * </LiveSupportProvider>
 */
const ModeratorLiveSupport: React.FC = () => {
  const liveSupport = useLiveSupport();

  // If hook is not inside provider, this safely fails instead of throwing React 301
  if (!liveSupport) {
    console.error("ModeratorLiveSupport must be used inside a LiveSupportProvider");
    return (
      <div className="p-6 text-center text-red-500">
        ⚠️ LiveSupportProvider missing. Wrap your app in:
        <pre className="bg-muted p-2 rounded mt-2">{`<LiveSupportProvider>\n  <App />\n</LiveSupportProvider>`}</pre>
      </div>
    );
  }

  const { supportSessions, currentSupportSession, setCurrentSupportSessionId, getUserSupportStats } = liveSupport;

  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [hasNewSessions, setHasNewSessions] = useState(false);

  // Build feedback chart data
  useEffect(() => {
    const ratings = supportSessions
      .filter((session) => session.rating)
      .map((session) => ({ rating: session.rating, feedback: session.feedback }));

    const ratingCounts = [0, 0, 0, 0, 0];
    ratings.forEach((item) => {
      if (item.rating && item.rating > 0 && item.rating <= 5) {
        ratingCounts[item.rating - 1]++;
      }
    });

    setFeedbackData([1, 2, 3, 4, 5].map((r) => ({ rating: r, count: ratingCounts[r - 1] })));
  }, [supportSessions]);

  // Detect new incoming sessions
  useEffect(() => {
    const unreadSessions = supportSessions.filter(
      (session) => session.status === "active" && session.last_read_by_moderator === false,
    );

    if (unreadSessions.length > 0) {
      setHasNewSessions(true);
      toast({
        title: "New Support Request",
        description: `${unreadSessions.length} support ${
          unreadSessions.length === 1 ? "session" : "sessions"
        } waiting for assistance.`,
      });
    }
  }, [supportSessions]);

  // Handle selecting a support session
  const handleSelectSession = (session: SupportSession) => {
    try {
      setSelectedSession(session);
      setCurrentSupportSessionId(session.id);

      const newWindow = window.open(
        `/support/${session.id}`,
        `support-session-${session.id}`,
        "width=700,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no",
      );

      if (!newWindow || newWindow.closed) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to open support sessions.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error opening support session:", error);
      toast({
        title: "Error",
        description: "Failed to open support session window.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Active Sessions Panel */}
      <div className="col-span-1 border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-medium">Active Support Sessions</h3>
          {hasNewSessions && (
            <Badge variant="destructive" className="animate-pulse flex items-center">
              <Bell className="h-3 w-3 mr-1" /> New
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[500px]">
          {supportSessions.filter((s) => s.status !== "ended" && s.user_id).length > 0 ? (
            supportSessions
              .filter((s) => s.status !== "ended" && s.user_id)
              .map((session) => {
                const isRead = session.last_read_by_moderator === true;
                const userHasVPN = session.userInfo?.vpnDetected;

                return (
                  <Button
                    key={session.id}
                    variant={isRead ? "ghost" : "default"}
                    className={`w-full justify-start p-4 h-auto border-b hover:bg-accent ${
                      !isRead ? "bg-muted" : ""
                    } ${userHasVPN ? "bg-orange-50 dark:bg-orange-900/20" : ""}`}
                    onClick={() => handleSelectSession(session)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <UserAvatar
                        username={session.userInfo?.username || "User"}
                        photoURL={session.userInfo?.photo_url}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium flex justify-between">
                          <span>{session.userInfo?.display_name || "User"}</span>
                          <div className="flex space-x-1">
                            {userHasVPN && (
                              <Badge variant="outline" className="ml-2 bg-orange-200 text-orange-800 text-xs">
                                VPN
                              </Badge>
                            )}
                            {!isRead && <Badge variant="outline">New</Badge>}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">@{session.userInfo?.username || "user"}</div>
                        {session.last_message && (
                          <div className="text-sm text-muted-foreground truncate mt-1">
                            {session.last_message.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })
          ) : (
            <p className="p-4 text-center text-muted-foreground">No active support sessions</p>
          )}
        </ScrollArea>
      </div>

      {/* Chat + User Info Panel */}
      <div className="col-span-2 border rounded-lg overflow-hidden">
        {selectedSession ? (
          <div className="h-full flex flex-col">
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    username={selectedSession.userInfo?.username || "User"}
                    photoURL={selectedSession.userInfo?.photo_url}
                  />
                  <div>
                    {selectedSession.userInfo?.display_name || "User"}
                    <div className="text-xs text-muted-foreground">@{selectedSession.userInfo?.username || "user"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedSession.userInfo?.vpnDetected && (
                    <Badge variant="outline" className="bg-orange-200 text-orange-800">
                      VPN Detected
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedSession.status === "active"
                      ? "Active"
                      : selectedSession.status === "requested-end"
                        ? "End Requested"
                        : "Ended"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <LiveSupportChat />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground">Select a support session to view details</p>
          </div>
        )}
      </div>

      {/* Feedback + Archives Panel */}
      <div className="col-span-1 lg:col-span-3 border rounded-lg overflow-hidden">
        <Tabs defaultValue="chart">
          <div className="p-4 border-b">
            <TabsList>
              <TabsTrigger value="chart">Feedback Ratings</TabsTrigger>
              <TabsTrigger value="comments">Feedback Comments</TabsTrigger>
              <TabsTrigger value="files">
                <Archive className="h-4 w-4 mr-2" />
                Archives
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chart" className="p-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feedbackData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Number of Ratings" fill="#6264A7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="p-4">
            <ScrollArea className="h-[400px]">
              {supportSessions.filter((s) => s.feedback).length > 0 ? (
                supportSessions
                  .filter((s) => s.feedback)
                  .map((session) => (
                    <div key={session.id} className="p-3 bg-muted rounded-md mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <RatingStars rating={session.rating} />
                        <span className="text-sm text-muted-foreground">
                          {session.created_at ? format(new Date(session.created_at), "PPp") : ""}
                        </span>
                      </div>
                      <p className="text-sm">{session.feedback}</p>
                    </div>
                  ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No feedback comments available</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files">
            <ArchivedSupportSessions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function RatingStars({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rating ? "text-yellow-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default ModeratorLiveSupport;
