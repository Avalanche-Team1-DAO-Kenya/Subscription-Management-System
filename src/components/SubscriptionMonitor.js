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
import { ethers } from "ethers";

function SubscriptionMonitor() {
  const { account, contract, addNotification, web3 } = useContext(AppContext);

  const checkAndProcessRenewals = async () => {
    if (!account || !contract || !web3) {
      console.log("Missing required context:", { account, contract, web3 });
      return;
    }

    console.log("Contract state:", contract);
    if (contract && contract.subscribe) {
      console.log("Subscribe method exists on contract.");
    } else {
      console.error("Subscribe method is missing on contract.");
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

      for (const doc of querySnapshot.docs) {
        const subscription = doc.data();

        // Check if subscription is near expiration (within 30 seconds)
        if (subscription.endTime - now <= 30 && subscription.endTime > now) {
          try {
            console.log("Processing renewal for subscription:", subscription);

            // Convert price to wei
            const priceInWei = ethers.parseEther(subscription.price.toString());

            // Estimate gas first
            const gasEstimate = await contract.processPayment.estimateGas(
              subscription.id,
              {
                from: account,
                value: priceInWei.toString(),
              }
            );

            // Create the transaction with estimated gas
            const tx = await contract.processPayment(subscription.id, {
              from: account,
              value: priceInWei.toString(),
              gasLimit: Math.ceil(gasEstimate * 1.2), // Add 20% buffer for safety
            });

            console.log("Transaction sent:", tx);

            // Update subscription in Firestore after successful payment
            const newEndTime = now + Number(subscription.duration);
            await updateDoc(doc.ref, {
              startTime: now,
              endTime: newEndTime,
              updatedAt: new Date().toISOString(),
              lastRenewalTime: now,
              transactionHash: tx.hash,
              status: "active",
            });

            addNotification("Subscription auto-renewed successfully!");
          } catch (error) {
            console.error("Auto-renewal failed:", error);

            let errorMessage = "Auto-renewal failed. ";
            if (error.code === 4001) {
              errorMessage += "Transaction was rejected.";
            } else if (error.code === -32603) {
              errorMessage += "Gas estimation failed. Please try again.";
            } else {
              errorMessage +=
                "Please check your wallet balance and approve the transaction.";
            }

            addNotification(errorMessage);

            // Disable auto-renew on failure
            await updateDoc(doc.ref, {
              autoRenew: false,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking renewals:", error);
    }
  };

  useEffect(() => {
    if (!contract || !web3) return;

    // Check every 15 seconds
    const interval = setInterval(checkAndProcessRenewals, 15000);
    return () => clearInterval(interval);
  }, [account, contract, web3]);

  return null;
}

export default SubscriptionMonitor;
