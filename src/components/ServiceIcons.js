import React from "react";
import {
  FaNewspaper,
  FaVideo,
  FaCode,
  FaMusic,
  FaGraduationCap,
  FaFlask,
} from "react-icons/fa";

function ServiceIcons({ onServiceSelect, disabled }) {
  const services = [
    {
      id: 1,
      name: "Nation Media",
      type: "newsletter",
      icon: <FaNewspaper />,
      description: "Digital news subscription",
    },
    {
      id: 2,
      name: "Showmax Kenya",
      type: "streaming",
      icon: <FaVideo />,
      description: "Video streaming service",
    },
    {
      id: 3,
      name: "DSTV",
      type: "streaming",
      icon: <FaVideo />,
      description: "Premium TV streaming service",
    },
    {
      id: 4,
      name: "Mdundo",
      type: "streaming",
      icon: <FaMusic />,
      description: "Music streaming platform",
    },
    {
      id: 5,
      name: "Elimu Library",
      type: "saas",
      icon: <FaGraduationCap />,
      description: "Educational content platform",
    },
    {
      id: 6,
      name: "Test Service",
      type: "test",
      icon: <FaFlask />,
      description: "Test subscription service (2-min plans)",
    },
  ];

  return (
    <div className="services-grid">
      {services.map((service) => (
        <div
          key={service.id}
          className={`service-card ${disabled ? "disabled" : ""}`}
          onClick={() => !disabled && onServiceSelect(service)}
          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        >
          <div className="service-icon">{service.icon}</div>
          <h3>{service.name}</h3>
          <p>{service.description}</p>
        </div>
      ))}
    </div>
  );
}

export default ServiceIcons;
