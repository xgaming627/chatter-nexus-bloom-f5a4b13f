import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useFreeTrialModals = () => {
  const { currentUser } = useAuth();
  const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const checkTrialStatus = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nexus_plus_active, nexus_plus_expires_at, free_trial_claimed, nexus_plus_reminder_shown")
        .eq("user_id", currentUser.uid)
        .single();

      if (!profile) return;

      // Show welcome modal for new free trial users
      if (profile.nexus_plus_active && profile.free_trial_claimed && !profile.nexus_plus_reminder_shown) {
        const expiresAt = new Date(profile.nexus_plus_expires_at);
        const now = new Date();
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 3 && daysLeft > 0) {
          setShowFreeTrialModal(true);

          await supabase.from("profiles").update({ nexus_plus_reminder_shown: true }).eq("user_id", currentUser.uid);
        }
      }

      // Show expiring modal 12–36 hours before expiry
      if (profile.nexus_plus_active && profile.nexus_plus_expires_at) {
        const expiresAt = new Date(profile.nexus_plus_expires_at);
        const now = new Date();
        const hoursLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursLeft > 12 && hoursLeft <= 36 && profile.nexus_plus_reminder_shown) {
          setShowExpiringModal(true);
        }
      }
    };

    checkTrialStatus();
  }, [currentUser]);

  return {
    showFreeTrialModal,
    setShowFreeTrialModal,
    showExpiringModal,
    setShowExpiringModal,
  };
};
