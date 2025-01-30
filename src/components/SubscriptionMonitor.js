import { useEffect, useContext } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import AppContext from "../context/AppContext";

function SubscriptionMonitor() {
  const { account, contract, addNotification, web3 } = useContext(AppContext);

  const checkAndProcessRenewals = async () => {
    if (!account || !contract || !web3) {
      console.log("Missing required context:", { account, contract, web3 });
      return;
    }

    console.log("Contract state:", contract);
    if (contract.methods && contract.methods.createSubscription) {
      console.log("CreateSubscription method exists on contract.");
    } else {
      console.error("CreateSubscription method is missing on contract.");
      return;
    }

    try {
      const q = query(
        collection(db, "userSubscriptions"),
        where("userId", "==", account.toLowerCase()),
        where("autoRenew", "==", true),
        where("status", "==", "active"),
        where("isCancelled", "==", false)
      );

      const querySnapshot = await getDocs(q);
      const now = Math.floor(Date.now() / 1000);

      for (const docRef of querySnapshot.docs) {
        const subscription = docRef.data();

        // Check if subscription is near expiration (within 30 seconds)
        if (subscription.endTime - now <= 30 && subscription.endTime > now) {
          try {
            console.log("Processing renewal for subscription:", subscription);

            // Convert price to wei
            const priceInWei = web3.utils.toWei(subscription.price.toString(), 'ether');
            
            // Estimate gas
            const gasEstimate = await contract.methods.createSubscription(
              priceInWei,
              subscription.duration
            ).estimateGas({
              from: account,
              value: priceInWei
            });

            // Send transaction
            const tx = await contract.methods.createSubscription(
              priceInWei,
              subscription.duration
            ).send({
              from: account,
              value: priceInWei,
              gas: Math.ceil(gasEstimate * 1.2) // Add 20% buffer
            });

            console.log("Transaction sent:", tx);

            // Update subscription in Firestore
            await updateDoc(doc(db, "userSubscriptions", docRef.id), {
              lastRenewalTime: now,
              endTime: now + subscription.duration,
              transactionHash: tx.transactionHash
            });

            addNotification("Subscription renewed successfully!");
          } catch (error) {
            console.error("Error processing renewal:", error);
            addNotification("Failed to renew subscription: " + error.message);
          }
        }
      }
    } catch (error) {
      console.error("Error checking renewals:", error);
      addNotification("Error checking subscription renewals");
    }
  };

  useEffect(() => {
    // Check for renewals every 15 seconds
    const interval = setInterval(checkAndProcessRenewals, 15000);
    return () => clearInterval(interval);
  }, [account, contract, web3]);

  return null;
}

export default SubscriptionMonitor;
