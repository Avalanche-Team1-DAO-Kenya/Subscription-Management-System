import { collection, getDocs, deleteDoc, writeBatch, doc, query, where } from 'firebase/firestore';
import { db } from './config';

const subscriptionPlans = [
  // Nation Media Plans
  {
    serviceId: 1,
    name: "Monthly",
    price: "0.01",
    duration: 30,
    features: [
      "Daily news access",
      "E-paper access",
      "Breaking news alerts",
      "Basic article commenting"
    ]
  },
  {
    serviceId: 1,
    name: "6 Months",
    price: "0.05",
    duration: 180,
    features: [
      "All Monthly features",
      "Premium articles",
      "Archive access",
      "Ad-free experience",
      "15% discount"
    ]
  },
  {
    serviceId: 1,
    name: "Yearly",
    price: "0.08",
    duration: 365,
    features: [
      "All 6 Months features",
      "Exclusive content",
      "Priority customer support",
      "Multiple device access",
      "25% discount",
      "Magazine subscription included"
    ]
  },

  // Showmax Kenya Plans
  {
    serviceId: 2,
    name: "Monthly",
    price: "0.015",
    duration: 30,
    features: [
      "HD streaming",
      "Watch on 1 device",
      "Download shows",
      "No ads"
    ]
  },
  {
    serviceId: 2,
    name: "6 Months",
    price: "0.025",
    duration: 180,
    features: [
      "Full HD streaming",
      "Watch on 2 devices",
      "Download shows",
      "No ads",
      "15% discount",
      "Offline viewing"
    ]
  },
  {
    serviceId: 2,
    name: "Yearly",
    price: "0.045",
    duration: 365,
    features: [
      "4K Ultra HD",
      "Watch on 4 devices",
      "Download shows",
      "No ads",
      "Offline viewing",
      "25% discount",
      "Early access to new releases"
    ]
  },

  // DSTV Plans
  {
    serviceId: 3,
    name: "Monthly",
    price: "0.02",
    duration: 30,
    features: [
      "Basic channels",
      "SD quality",
      "1 device",
      "Basic support"
    ]
  },
  {
    serviceId: 3,
    name: "6 Months",
    price: "0.035",
    duration: 180,
    features: [
      "All channels",
      "HD quality",
      "2 devices",
      "Premium support",
      "Recording feature",
      "15% discount"
    ]
  },
  {
    serviceId: 3,
    name: "Yearly",
    price: "0.06",
    duration: 365,
    features: [
      "All 6 Months features",
      "4K quality",
      "4 devices",
      "Priority support",
      "Unlimited recording",
      "25% discount",
      "Sports channels"
    ]
  },

  // Mdundo Plans
  {
    serviceId: 4,
    name: "Monthly",
    price: "0.008",
    duration: 30,
    features: [
      "Ad-free music",
      "Basic quality",
      "Offline mode",
      "Basic playlists"
    ]
  },
  {
    serviceId: 4,
    name: "6 Months",
    price: "0.03",
    duration: 180,
    features: [
      "High quality audio",
      "Custom playlists",
      "Lyrics access",
      "Premium support",
      "15% discount"
    ]
  },
  {
    serviceId: 4,
    name: "Yearly",
    price: "0.05",
    duration: 365,
    features: [
      "All 6 Months features",
      "Highest quality audio",
      "Unlimited downloads",
      "Priority support",
      "25% discount",
      "Early access to new releases"
    ]
  },

  // Elimu Library Plans
  {
    serviceId: 5,
    name: "Monthly",
    price: "0.012",
    duration: 30,
    features: [
      "Basic access",
      "Download PDFs",
      "Basic search",
      "Community support"
    ]
  },
  {
    serviceId: 5,
    name: "6 Months",
    price: "0.04",
    duration: 180,
    features: [
      "Full access",
      "Advanced search",
      "Citation tools",
      "Premium support",
      "15% discount"
    ]
  },
  {
    serviceId: 5,
    name: "Yearly",
    price: "0.07",
    duration: 365,
    features: [
      "All 6 Months features",
      "Research tools",
      "API access",
      "Priority support",
      "25% discount",
      "Exclusive webinars"
    ]
  },

  // Test Service Plans (2-minute durations)
  {
    serviceId: 6,
    name: "2 Minutes",
    price: "0.005",
    duration: 0.00139, // 2 minutes in days
    features: [
      "Quick test plan",
      "2-minute duration",
      "Auto-renewal testing",
      "Basic features"
    ]
  },
  {
    serviceId: 6,
    name: "4 Minutes",
    price: "0.008",
    duration: 0.00278, // 4 minutes in days
    features: [
      "All 2-minute features",
      "4-minute duration",
      "Premium test features",
      "15% discount"
    ]
  },
  {
    serviceId: 6,
    name: "6 Minutes",
    price: "0.01",
    duration: 0.00417, // 6 minutes in days
    features: [
      "All 4-minute features",
      "6-minute duration",
      "Advanced test features",
      "25% discount",
      "Priority support"
    ]
  }
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const retryOperation = async (operation, retries = MAX_RETRIES) => {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
};

// Function to clear existing plans
const clearExistingPlans = async () => {
  try {
    const plansRef = collection(db, 'subscriptionPlans');
    const existingPlans = await getDocs(plansRef);
    
    // Delete all existing plans
    const deletePromises = existingPlans.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    console.log('Cleared existing plans');
  } catch (error) {
    console.error('Error clearing plans:', error);
    throw error;
  }
};

// Function to seed subscription plans
export const seedSubscriptionPlans = async () => {
  try {
    // First check if plans already exist
    const plansRef = collection(db, 'subscriptionPlans');
    const existingPlans = await getDocs(plansRef);
    
    if (!existingPlans.empty) {
      console.log('Plans already seeded, skipping...');
      return;
    }

    const batch = writeBatch(db);
    let operationCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch limit

    for (const plan of subscriptionPlans) {
      const planRef = doc(plansRef);
      batch.set(planRef, {
        ...plan,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      operationCount++;
      
      // If we reach the batch limit, commit and start a new batch
      if (operationCount === BATCH_LIMIT) {
        await batch.commit();
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }

    console.log('Successfully seeded subscription plans');
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    throw error;
  }
};

// Function to get plans for a specific service with caching
export const getServicePlans = async (serviceId) => {
  try {
    const q = query(
      collection(db, 'subscriptionPlans'),
      where('serviceId', '==', serviceId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching service plans:', error);
    throw error;
  }
};