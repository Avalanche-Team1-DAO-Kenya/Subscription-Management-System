// frontend/src/context/AppContext.js
import React, { createContext, useState, useEffect } from "react";
import Web3 from "web3";
import SubscriptionManagerABI from "../SubscriptionManager.json";

const AppContext = createContext();

const AVAX_CHAIN_ID = "a86a";
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// Validate contract address is available
if (!CONTRACT_ADDRESS) {
  console.error(
    "Contract address not found. Make sure CONTRACT_ADDRESS is set in your .env file."
  );
}

export const AppProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [networkVerified, setNetworkVerified] = useState(false);

  const addNotification = (message) => {
    setNotifications((prevNotifications) => [...prevNotifications, message]);
    setTimeout(() => {
      setNotifications((prevNotifications) => prevNotifications.slice(1));
    }, 5000);
  };

  // Add this function to check network
  const verifyNetwork = async () => {
    if (!web3) return false;

    try {
      const chainId = await web3.eth.getChainId();
      const networkId = await web3.eth.net.getId();
      console.log("Connected to Chain ID:", chainId);
      console.log("Network ID:", networkId);

      // Convert BigInt to Number for comparison
      const chainIdNumber = Number(chainId);

      // Fuji Testnet Chain ID is 43113
      if (chainIdNumber !== 43113) {
        addNotification("Please connect to Fuji C-Chain (Chain ID: 43113)");
        setNetworkVerified(false);
        return false;
      }

      setNetworkVerified(true);
      return true;
    } catch (error) {
      console.error("Network verification failed:", error);
      setNetworkVerified(false);
      return false;
    }
  };

  // Initialize Web3 and contract when wallet is connected
  useEffect(() => {
    const initializeWeb3 = async () => {
      if (window.ethereum && account) {
        try {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          const contractInstance = new web3Instance.eth.Contract(
            SubscriptionManagerABI,
            CONTRACT_ADDRESS
          );
          setContract(contractInstance);

          // Verify network after initializing web3
          await verifyNetwork();
        } catch (error) {
          console.error("Error initializing Web3:", error);
          addNotification("Error connecting to blockchain");
        }
      }
    };

    initializeWeb3();
  }, [account]);

  useEffect(() => {
    const verifyContract = async () => {
      if (web3 && contract) {
        try {
          const code = await web3.eth.getCode(CONTRACT_ADDRESS);
          if (code === "0x" || code === "0x0") {
            console.error("No contract found at address:", CONTRACT_ADDRESS);
            addNotification("Contract not found at specified address");
          } else {
            console.log("Contract verified at:", CONTRACT_ADDRESS);
            const count = await contract.methods.subscriptionCount().call();
            console.log("Contract is responsive. Subscription count:", count);
          }
        } catch (error) {
          console.error("Contract verification failed:", error);
          addNotification(
            "Error verifying contract. Please check network and address"
          );
        }
      }
    };

    verifyContract();
  }, []);
  // }, [web3, contract, addNotification]);

  const value = {
    web3,
    setWeb3,
    account,
    setAccount,
    contract,
    setContract,
    notifications,
    addNotification,
    darkMode,
    setDarkMode,
    isLoading,
    setIsLoading,
    selectedService,
    setSelectedService,
    selectedPlan,
    setSelectedPlan,
    AVAX_CHAIN_ID,
    CONTRACT_ADDRESS,
    verifyNetwork,
    networkVerified,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
