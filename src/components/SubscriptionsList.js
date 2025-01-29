import React, { useState, useEffect, useContext } from "react";
import AppContext from "../context/AppContext";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { FaTrash } from "react-icons/fa";
import Web3 from "web3";

function SubscriptionsList({ selectedService }) {
  const { account, addNotification, isLoading, setIsLoading, darkMode } =
    useContext(AppContext);
  const [subscriptions, setSubscriptions] = useState([]);

  const fetchSubscriptions = async (force = false) => {
    if (!account || !selectedService) return;

    setIsLoading(true);
    try {
      // Create query to get user's subscriptions for the selected service
      const q = query(
        collection(db, "userSubscriptions"),
        where("userId", "==", account.toLowerCase()),
        where("serviceId", "==", selectedService.id)
      );

      const querySnapshot = await getDocs(q);
      const subs = [];

      querySnapshot.forEach((doc) => {
        subs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("Fetched subscriptions:", subs);
      setSubscriptions(subs);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      addNotification("Error fetching subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    try {
      return Web3.utils.fromWei(price.toString(), "ether");
    } catch (error) {
      console.error("Error formatting price:", error);
      return "0";
    }
  };

  const handleDelete = async (subscriptionId) => {
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId);

    if (subscription.status === "active") {
      addNotification(
        "Cannot delete an active subscription. Please cancel it first."
      );
      return;
    }

    if (!window.confirm("Are you sure you want to delete this subscription?")) {
      return;
    }

    setIsLoading(true);
    try {
      const docRef = doc(db, "userSubscriptions", subscriptionId);
      await deleteDoc(docRef);
      addNotification("Subscription deleted successfully");
      await fetchSubscriptions(true);
    } catch (error) {
      console.error("Error deleting subscription:", error);
      addNotification("Error deleting subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoRenewToggle = async (subscriptionId, newAutoRenewValue) => {
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId);

    if (!subscription.status === "active") {
      addNotification(
        "Auto-renew can only be toggled for active subscriptions"
      );
      return;
    }

    setIsLoading(true);
    try {
      const docRef = doc(db, "userSubscriptions", subscriptionId);

      await updateDoc(docRef, {
        autoRenew: newAutoRenewValue,
        updatedAt: new Date().toISOString(),
      });

      addNotification(
        `Auto-renew ${newAutoRenewValue ? "enabled" : "disabled"}`
      );
      await fetchSubscriptions(true);
    } catch (error) {
      console.error("Error updating auto-renew:", error);
      addNotification("Error updating auto-renew setting");
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async (subscriptionId, price) => {
    if (!window.ethereum) {
      addNotification("Please install Core wallet to make payments");
      return;
    }

    setIsLoading(true);
    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Convert price to hex for ethereum transaction
      const priceInHex = `0x${window.BigInt(price).toString(16)}`;

      // Increase gas limit for better transaction success rate
      const gasLimit = `0x${(100000).toString(16)}`; // Increased from 21000

      // Send payment transaction
      const transactionParameters = {
        from: account,
        value: priceInHex,
        gas: gasLimit,
        chainId: "0xa869", // Avalanche Fuji Testnet Chain ID
        maxFeePerGas: "0x2540be400", // 10 Gwei
        maxPriorityFeePerGas: "0x3b9aca00", // 1 Gwei
      };

      console.log("Transaction parameters:", transactionParameters);

      try {
        // First estimate gas
        const gasEstimate = await window.ethereum.request({
          method: "eth_estimateGas",
          params: [transactionParameters],
        });

        // Update gas limit with estimate
        transactionParameters.gas = gasEstimate;

        // Send transaction
        const txHash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [transactionParameters],
        });

        console.log("Payment transaction hash:", txHash);

        // Wait for transaction confirmation
        let confirmationAttempts = 0;
        const maxAttempts = 30; // 30 seconds timeout

        while (confirmationAttempts < maxAttempts) {
          try {
            const receipt = await window.ethereum.request({
              method: "eth_getTransactionReceipt",
              params: [txHash],
            });

            if (receipt) {
              // Transaction confirmed
              // Update subscription status in Firestore
              const docRef = doc(db, "userSubscriptions", subscriptionId);
              const now = new Date();
              await updateDoc(docRef, {
                status: "active",
                startTime: Math.floor(now.getTime() / 1000),
                updatedAt: now.toISOString(),
                transactionHash: txHash,
              });

              addNotification("Payment processed successfully!");
              fetchSubscriptions(true);
              return;
            }
          } catch (error) {
            console.log("Waiting for confirmation...");
          }

          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          confirmationAttempts++;
        }

        throw new Error("Transaction confirmation timeout");
      } catch (txError) {
        console.error("Transaction error:", txError);
        throw txError;
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      if (error.code === 4001) {
        addNotification("Transaction was rejected by user");
      } else if (error.code === -32602) {
        addNotification(
          "Invalid transaction parameters. Please check the amount and try again."
        );
      } else if (error.code === -32603) {
        addNotification(
          "Network error. Please try again or check your wallet connection."
        );
      } else if (error.message === "Transaction confirmation timeout") {
        addNotification(
          "Transaction is taking longer than expected. Please check your wallet for status."
        );
      } else {
        addNotification("Error processing payment. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (subscriptionId) => {
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId);

    if (!subscription.autoRenew) {
      addNotification(
        "Only subscriptions with auto-renew enabled can be cancelled"
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to cancel this subscription? You will still have access until ${new Date(
          subscription.endTime * 1000
        ).toLocaleDateString()}`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const q = query(
        collection(db, "userSubscriptions"),
        where("userId", "==", account.toLowerCase()),
        where("id", "==", subscriptionId)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        await updateDoc(querySnapshot.docs[0].ref, {
          isCancelled: true,
          status: "cancelled",
          autoRenew: false,
          updatedAt: new Date().toISOString(),
        });
        addNotification(
          `Subscription cancelled. Access available until ${new Date(
            subscription.endTime * 1000
          ).toLocaleDateString()}`
        );
        fetchSubscriptions(true);
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      addNotification("Error updating subscription status");
    } finally {
      setIsLoading(false);
    }
  };

  const isSubscriptionExpired = (endTime) => {
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    return currentTime > endTime;
  };

  const getSubscriptionStatus = (sub) => {
    if (sub.isCancelled) return "cancelled";
    if (isSubscriptionExpired(sub.endTime)) return "inactive";
    return sub.status;
  };

  useEffect(() => {
    fetchSubscriptions();

    // Add event listener for subscription creation
    const handleSubscriptionCreated = () => {
      console.log("Subscription created event received");
      fetchSubscriptions(true);
    };

    window.addEventListener("subscriptionCreated", handleSubscriptionCreated);

    // Cleanup
    return () => {
      window.removeEventListener(
        "subscriptionCreated",
        handleSubscriptionCreated
      );
    };
  }, [account, selectedService]);

  return (
    <div className="subscriptions-container">
      <div className="subscriptions-header">
        <h3>{selectedService.name} Subscriptions</h3>
        <button
          onClick={() => fetchSubscriptions(true)}
          className="refresh-button"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <p>Loading subscriptions...</p>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">
          <p>No subscriptions found for {selectedService.name}.</p>
          <p>Create a new subscription to get started!</p>
        </div>
      ) : (
        <div className="subscriptions-grid">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className={`subscription-card ${darkMode ? "dark-mode" : ""} ${
                sub.isCancelled ? "cancelled" : ""
              }`}
            >
              <div className="subscription-header">
                <div className="header-content">
                  <h4>{sub.serviceName}</h4>
                  <span className="plan-badge">{sub.planName}</span>
                </div>
                {sub.status === "inactive" && (
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="delete-button"
                    disabled={isLoading}
                    title="Delete Subscription"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>

              <div className="subscription-content">
                <div className="subscription-info">
                  <div className="info-item">
                    <span className="label">Price:</span>
                    <span className="value">{formatPrice(sub.price)} AVAX</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span
                      className={`status-badge ${getSubscriptionStatus(sub)}`}
                    >
                      {getSubscriptionStatus(sub).charAt(0).toUpperCase() +
                        getSubscriptionStatus(sub).slice(1)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Created:</span>
                    <span className="value">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Valid Until:</span>
                    <span className="value">
                      {new Date(sub.endTime * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Auto-Renew:</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={sub.autoRenew || false}
                        onChange={() =>
                          handleAutoRenewToggle(sub.id, !sub.autoRenew)
                        }
                        disabled={sub.status !== "active" || sub.isCancelled}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="card-actions">
                  {!sub.isActive &&
                    !sub.isCancelled &&
                    !sub.transactionHash && (
                      <button
                        onClick={() => processPayment(sub.id, sub.price)}
                        disabled={isLoading}
                        className="action-button payment-button"
                      >
                        <span className="payment-amount">
                          {formatPrice(sub.price)} AVAX
                        </span>
                        <span>Pay Now</span>
                      </button>
                    )}
                  {sub.isActive && !sub.isCancelled && sub.autoRenew && (
                    <button
                      onClick={() => handleCancel(sub.id)}
                      disabled={isLoading}
                      className="action-button cancel-button"
                    >
                      Cancel
                    </button>
                  )}
                  {sub.isCancelled && (
                    <div className="cancelled-notice">
                      <span>Cancelled - Access until</span>
                      <span>
                        {new Date(sub.endTime * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubscriptionsList;
