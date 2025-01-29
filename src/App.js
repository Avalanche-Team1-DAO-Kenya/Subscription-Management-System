// frontend/src/App.js
import React, { useContext, useState, useEffect } from "react";
import "./App.css";
import AppContext from "./context/AppContext";
import CreateSubscription from "./components/CreateSubscription";
import SubscriptionsList from "./components/SubscriptionsList";
import Notifications from "./components/Notifications";
import ConnectWallet from "./components/ConnectWallet";
import ServiceIcons from "./components/ServiceIcons";
import { FaMoon, FaSun, FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import SubscriptionPlans from "./components/SubscriptionPlans";
import { seedSubscriptionPlans } from "./firebase/seedData";
import ErrorBoundary from "./components/ErrorBoundary";
import SubscriptionMonitor from "./components/SubscriptionMonitor";

function App() {
  const { account, darkMode, setDarkMode, notifications, addNotification } =
    useContext(AppContext);
  const [selectedService, setSelectedService] = useState(null);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    // Validate Firebase configuration
    const requiredEnvVars = [
      "REACT_APP_FIREBASE_API_KEY",
      "REACT_APP_FIREBASE_AUTH_DOMAIN",
      "REACT_APP_FIREBASE_PROJECT_ID",
      "REACT_APP_FIREBASE_STORAGE_BUCKET",
      "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
      "REACT_APP_FIREBASE_APP_ID",
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      console.error("Missing required environment variables:", missingEnvVars);
      addNotification("Error: Missing Firebase configuration");
      return;
    }

    seedSubscriptionPlans().catch((error) => {
      console.error("Error seeding data:", error);
      addNotification("Error initializing application data");
    });
  }, [addNotification]);

  const handleBack = () => {
    if (selectedPlan) {
      // If a plan is selected, go back to plans view
      setSelectedPlan(null);
    } else {
      // If no plan is selected, go back to services
      setSelectedService(null);
    }
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return showFullAddress
      ? address
      : `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  return (
    <ErrorBoundary>
      <div className={`App ${darkMode ? "dark-mode" : ""}`}>
        <SubscriptionMonitor />
        <div className="top-bar">
          {account && (selectedService || selectedPlan) && (
            <button
              className="icon-button back-button"
              onClick={handleBack}
              aria-label={selectedPlan ? "Back to plans" : "Back to services"}
            >
              <FaArrowLeft />
            </button>
          )}
          <div className="logo">
            <h1>Subscription Manager</h1>
          </div>
          <div className="controls">
            <button
              className="icon-button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <ConnectWallet />
          </div>
        </div>

        <main className="main-content">
          {!account && (
            <div className="welcome-screen">
              <h2>Welcome to Subscription Manager</h2>
              <p>Connect your wallet to manage subscriptions</p>
            </div>
          )}

          {account && (
            <div className="account-info-container">
              <p className="account-info">
                Connected: {formatAddress(account)}
                <button
                  className="icon-button address-toggle"
                  onClick={() => setShowFullAddress(!showFullAddress)}
                  aria-label="Toggle address visibility"
                >
                  {showFullAddress ? <FaEyeSlash /> : <FaEye />}
                </button>
              </p>
            </div>
          )}

          {!selectedService && (
            <ServiceIcons
              onServiceSelect={setSelectedService}
              disabled={!account}
            />
          )}

          {account && selectedService && (
            <>
              {selectedPlan ? (
                <>
                  <CreateSubscription
                    selectedService={selectedService}
                    selectedPlan={selectedPlan}
                    onBack={() => setSelectedPlan(null)}
                  />
                  <SubscriptionsList selectedService={selectedService} />
                </>
              ) : (
                <SubscriptionPlans
                  selectedService={selectedService}
                  onSelectPlan={handleSelectPlan}
                />
              )}
            </>
          )}
          <Notifications notifications={notifications} />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
