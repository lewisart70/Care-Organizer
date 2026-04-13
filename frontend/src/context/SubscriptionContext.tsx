import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './AuthContext';

// RevenueCat API Keys - loaded from environment variables
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';

// Usage limits for free users
export const FREE_LIMITS = {
  careRecipients: 1,
  aiQueriesPerMonth: 1,
  pdfExportsPerMonth: 1,
  careTeamInvites: 1,
};

export const PREMIUM_LIMITS = {
  careRecipients: Infinity,
  aiQueriesPerMonth: Infinity,
  pdfExportsPerMonth: Infinity,
  careTeamInvites: Infinity,
};

interface SubscriptionContextType {
  isSubscribed: boolean;
  isTrialActive: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  loading: boolean;
  usageCounts: {
    aiQueries: number;
    pdfExports: number;
    careRecipients: number;
    careTeamInvites: number;
  };
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkFeatureAccess: (feature: 'ai' | 'pdf' | 'recipients' | 'invites') => boolean;
  incrementUsage: (feature: 'ai' | 'pdf') => void;
  getLimits: () => typeof FREE_LIMITS | typeof PREMIUM_LIMITS;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageCounts, setUsageCounts] = useState({
    aiQueries: 0,
    pdfExports: 0,
    careRecipients: 0,
    careTeamInvites: 0,
  });

  const updateSubscriptionStatus = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    const premiumEntitlement = info.entitlements.active['Premium'];
    const isActive = !!premiumEntitlement;
    setIsSubscribed(isActive);
    setIsTrialActive(isActive && premiumEntitlement.periodType === 'TRIAL');
  }, []);

  // Initialize RevenueCat
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const initPurchases = async () => {
      try {
        if (Platform.OS === 'web') {
          setLoading(false);
          return;
        }

        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          appUserID: user.user_id || undefined,
        });

        const info = await Purchases.getCustomerInfo();
        if (!cancelled) updateSubscriptionStatus(info);

        const offeringsResult = await Purchases.getOfferings();
        if (!cancelled && offeringsResult.current) {
          setOfferings(offeringsResult.current);
        }

        Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
          if (!cancelled) updateSubscriptionStatus(updatedInfo);
        });
      } catch (error) {
        // RevenueCat init failed silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initPurchases();
    return () => { cancelled = true; };
  }, [user, updateSubscriptionStatus]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      updateSubscriptionStatus(newInfo);
      return true;
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Error', error.message || 'Failed to complete purchase');
      }
      return false;
    }
  }, [updateSubscriptionStatus]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      updateSubscriptionStatus(info);

      if (info.entitlements.active['Premium']) {
        Alert.alert('Success', 'Your subscription has been restored!');
        return true;
      } else {
        Alert.alert('No Subscription Found', 'We could not find an active subscription for this account.');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Restore Error', error.message || 'Failed to restore purchases');
      return false;
    }
  }, [updateSubscriptionStatus]);

  const getLimits = useCallback(() => {
    return isSubscribed ? PREMIUM_LIMITS : FREE_LIMITS;
  }, [isSubscribed]);

  const checkFeatureAccess = useCallback((feature: 'ai' | 'pdf' | 'recipients' | 'invites'): boolean => {
    if (isSubscribed) return true;
    switch (feature) {
      case 'ai':
        return usageCounts.aiQueries < FREE_LIMITS.aiQueriesPerMonth;
      case 'pdf':
        return usageCounts.pdfExports < FREE_LIMITS.pdfExportsPerMonth;
      case 'recipients':
        return usageCounts.careRecipients < FREE_LIMITS.careRecipients;
      case 'invites':
        return usageCounts.careTeamInvites < FREE_LIMITS.careTeamInvites;
      default:
        return true;
    }
  }, [isSubscribed, usageCounts]);

  const incrementUsage = useCallback((feature: 'ai' | 'pdf') => {
    setUsageCounts(prev => ({
      ...prev,
      aiQueries: feature === 'ai' ? prev.aiQueries + 1 : prev.aiQueries,
      pdfExports: feature === 'pdf' ? prev.pdfExports + 1 : prev.pdfExports,
    }));
  }, []);

  const contextValue = useMemo<SubscriptionContextType>(() => ({
    isSubscribed,
    isTrialActive,
    customerInfo,
    offerings,
    loading,
    usageCounts,
    purchasePackage,
    restorePurchases,
    checkFeatureAccess,
    incrementUsage,
    getLimits,
  }), [
    isSubscribed, isTrialActive, customerInfo, offerings, loading, usageCounts,
    purchasePackage, restorePurchases, checkFeatureAccess, incrementUsage, getLimits,
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
