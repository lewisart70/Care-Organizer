import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './AuthContext';

// RevenueCat API Keys
const REVENUECAT_API_KEY = 'test_xKKvmIoMLZwfPELEBDNrSCsYfEq';

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

  // Initialize RevenueCat
  useEffect(() => {
    const initPurchases = async () => {
      try {
        // Only initialize on native platforms
        if (Platform.OS === 'web') {
          console.log('RevenueCat not supported on web');
          setLoading(false);
          return;
        }

        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        
        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          appUserID: user?.user_id || undefined,
        });

        // Get customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionStatus(info);

        // Get offerings
        const offeringsResult = await Purchases.getOfferings();
        if (offeringsResult.current) {
          setOfferings(offeringsResult.current);
        }

        // Listen for customer info updates
        Purchases.addCustomerInfoUpdateListener((info) => {
          updateSubscriptionStatus(info);
        });

      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initPurchases();
    } else {
      setLoading(false);
    }
  }, [user]);

  const updateSubscriptionStatus = (info: CustomerInfo) => {
    setCustomerInfo(info);
    
    // Check for active entitlements - using "Premium" entitlement
    const premiumEntitlement = info.entitlements.active['Premium'];
    const isActive = !!premiumEntitlement;
    setIsSubscribed(isActive);
    
    // Check if in trial period
    if (premiumEntitlement) {
      const periodType = premiumEntitlement.periodType;
      setIsTrialActive(periodType === 'TRIAL');
    } else {
      setIsTrialActive(false);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
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
  };

  const restorePurchases = async (): Promise<boolean> => {
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
  };

  const getLimits = useCallback(() => {
    return isSubscribed ? PREMIUM_LIMITS : FREE_LIMITS;
  }, [isSubscribed]);

  const checkFeatureAccess = useCallback((feature: 'ai' | 'pdf' | 'recipients' | 'invites'): boolean => {
    if (isSubscribed) return true;
    
    const limits = FREE_LIMITS;
    switch (feature) {
      case 'ai':
        return usageCounts.aiQueries < limits.aiQueriesPerMonth;
      case 'pdf':
        return usageCounts.pdfExports < limits.pdfExportsPerMonth;
      case 'recipients':
        return usageCounts.careRecipients < limits.careRecipients;
      case 'invites':
        return usageCounts.careTeamInvites < limits.careTeamInvites;
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

  return (
    <SubscriptionContext.Provider
      value={{
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
      }}
    >
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
