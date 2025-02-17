import React, { useState, useRef, useEffect } from "react";

/* --- Terminal positions for each component (component size ~140x60) --- */
const terminalPositions = {
  battery: [
    { id: "P", x: 120, y: 25 }, // Positive terminal (right side)
    { id: "N", x: 0, y: 25 }, // Negative terminal (left side)
  ],
  resistor: [
    { id: "N", x: 0, y: 25 },
    { id: "P", x: 120, y: 25 },
  ],
  capacitor: [
    { id: "N", x: 0, y: 25 },
    { id: "P", x: 120, y: 25 },
  ],
  inductor: [
    { id: "N", x: 0, y: 25 },
    { id: "P", x: 120, y: 25 },
  ],
  led: [
    { id: "P", x: 0, y: 25 }, // Positive terminal (anode)
    { id: "N", x: 120, y: 25 }, // Negative terminal (cathode)
  ],
  ground: [
    { id: "GND", x: 60, y: 55 }, // Single terminal centered at bottom
  ],
};

/* --- Unit options for each component type --- */
const unitOptions = {
  battery: { default: "V", options: ["V"] },
  resistor: { default: "Ω", options: ["µΩ", "Ω", "kΩ", "MΩ"] },
  capacitor: { default: "µF", options: ["pF", "nF", "µF", "mF"] },
  inductor: { default: "mH", options: ["µH", "mH", "H"] },
  led: { default: "lm", options: ["lm"] },
  ground: null,
};

/** Toolbox Component
 * Renders draggable items representing each circuit element.
 */
function Toolbox({ onDragStart }) {
  const items = [
    { type: "battery", label: "Battery (Passion)" },
    { type: "resistor", label: "Resistor (Resilience)" },
    { type: "capacitor", label: "Capacitor (Memory)" },
    { type: "inductor", label: "Inductor (Growth)" },
    { type: "led", label: "LED (Joy)" },
    { type: "ground", label: "Ground" },
  ];

  return (
    <div className="toolbox">
      {items.map((item) => (
        <div
          key={item.type}
          className="toolbox-item"
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

/** Terminal Component
 * A small clickable circle representing a terminal node.
 */
function Terminal({ compId, terminalId, x, y, onClick, isSelected }) {
  return (
    <div
      className={`terminal ${isSelected ? "selected-terminal" : ""}`}
      style={{ left: x, top: y }}
      onClick={() => onClick(compId, terminalId)}
      title={terminalId}
    >
      {terminalId}
    </div>
  );
}

/** CircuitComponent
 * Represents a circuit element on the breadboard.
 * It is draggable, displays its value/unit (if applicable),
 * shows realistic terminal nodes, and includes a remove (bin) button.
 */
function CircuitComponent({
  comp,
  updateComponent,
  initiateTerminalConnection,
  removeComponent,
}) {
  const compRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const type = comp.type;

  const handleMouseDown = (e) => {
    setDragging(true);
    const rect = compRef.current.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging) {
        const boardRect = document
          .querySelector(".breadboard")
          .getBoundingClientRect();
        const newX = e.clientX - boardRect.left - offset.x;
        const newY = e.clientY - boardRect.top - offset.y;
        updateComponent(comp.id, { x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      if (dragging) setDragging(false);
    };

    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset, comp.id, updateComponent]);

  const handleValueChange = (e) => {
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    updateComponent(comp.id, { value: val });
  };

  const handleUnitChange = (e) => {
    updateComponent(comp.id, { unit: e.target.value });
  };

  const terminals = terminalPositions[type] || [];

  return (
    <div
      ref={compRef}
      className={`circuit-component ${comp.type} ${
        comp.connecting ? "connecting" : ""
      } ${comp.glow ? "led-glow" : ""}`}
      style={{ left: comp.x, top: comp.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="component-header">{type.toUpperCase()}</div>
      {unitOptions[type] && type !== "ground" && (
        <div className="value-input">
          <input
            type="number"
            min="0"
            value={comp.value}
            onChange={handleValueChange}
            placeholder={
              type === "battery"
                ? "Voltage"
                : type === "resistor"
                ? "Resistance"
                : type === "capacitor"
                ? "Capacitance"
                : type === "inductor"
                ? "Inductance"
                : "Value"
            }
          />
          <select
            value={comp.unit || unitOptions[type].default}
            onChange={handleUnitChange}
          >
            {unitOptions[type].options.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Remove button */}
      <button className="remove-btn" onClick={() => removeComponent(comp.id)}>
        ×
      </button>
      {/* Render terminals */}
      {terminals.map((t) => (
        <Terminal
          key={t.id}
          compId={comp.id}
          terminalId={t.id}
          x={t.x}
          y={t.y}
          onClick={initiateTerminalConnection}
          isSelected={comp.selectedTerminal === t.id}
        />
      ))}
    </div>
  );
}

/** Breadboard Component
 * The main canvas where components are dropped and wires are drawn.
 */
function Breadboard({
  components,
  addComponent,
  updateComponent,
  connections,
  initiateTerminalConnection,
  removeComponent,
}) {
  const boardRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("componentType");
    const boardRect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - boardRect.left;
    const y = e.clientY - boardRect.top;
    addComponent(type, x - 70, y - 30);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Render wires (each connection: { from: {compId, terminalId}, to: {compId, terminalId} })
  const renderWires = () => {
    return connections.map((conn, idx) => {
      const { from, to } = conn;
      const compA = components.find((c) => c.id === from.compId);
      const compB = components.find((c) => c.id === to.compId);
      if (!compA || !compB) return null;
      const termA = (terminalPositions[compA.type] || []).find(
        (t) => t.id === from.terminalId
      );
      const termB = (terminalPositions[compB.type] || []).find(
        (t) => t.id === to.terminalId
      );
      if (!termA || !termB) return null;
      const x1 = compA.x + termA.x;
      const y1 = compA.y + termA.y;
      const x2 = compB.x + termB.x;
      const y2 = compB.y + termB.y;
      return (
        <line
          key={idx}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#aaa"
          strokeWidth="2"
        />
      );
    });
  };

  return (
    <div
      className="breadboard"
      ref={boardRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <svg className="wire-layer">{renderWires()}</svg>
      {components.map((comp) => (
        <CircuitComponent
          key={comp.id}
          comp={comp}
          updateComponent={updateComponent}
          initiateTerminalConnection={initiateTerminalConnection}
          removeComponent={removeComponent}
        />
      ))}
    </div>
  );
}

/** DigitalDisplay Component
 * Shows the motivational message when the circuit is complete.
 */
function DigitalDisplay({ message }) {
  return <div className="display">{message}</div>;
}

/** ToggleSwitch Component
 * A button that checks the circuit and triggers the motivational message.
 */
function ToggleSwitch({ checkCircuit }) {
  return (
    <button className="toggle-switch" onClick={checkCircuit}>
      Toggle Switch
    </button>
  );
}

/** App Component
 * Main component holding all state and logic.
 */
function App() {
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectionStart, setConnectionStart] = useState(null);
  const [message, setMessage] = useState("Digital Display");

  // Add a new component when dropped.
  const addComponent = (type, x, y) => {
    const newComp = {
      id: Date.now().toString(),
      type,
      x,
      y,
      value: type === "ground" ? null : 0,
      unit: unitOptions[type] ? unitOptions[type].default : null,
      selectedTerminal: null,
      glow: false,
      brightness: 0,
    };
    setComponents((prev) => [...prev, newComp]);
  };

  // Update a component.
  const updateComponent = (id, updates) => {
    setComponents((prev) =>
      prev.map((comp) => (comp.id === id ? { ...comp, ...updates } : comp))
    );
  };

  // Remove a component and its connections.
  const removeComponent = (id) => {
    setComponents((prev) => prev.filter((comp) => comp.id !== id));
    setConnections((prev) =>
      prev.filter((conn) => conn.from.compId !== id && conn.to.compId !== id)
    );
    if (connectionStart && connectionStart.compId === id) {
      setConnectionStart(null);
    }
  };

  // Handle terminal connection wiring.
  const initiateTerminalConnection = (compId, terminalId) => {
    setComponents((prev) =>
      prev.map((comp) => ({ ...comp, selectedTerminal: null }))
    );
    if (!connectionStart) {
      setConnectionStart({ compId, terminalId });
      updateComponent(compId, { selectedTerminal: terminalId });
    } else {
      if (
        connectionStart.compId === compId &&
        connectionStart.terminalId === terminalId
      ) {
        setConnectionStart(null);
        updateComponent(compId, { selectedTerminal: null });
        return;
      }
      setConnections((prev) => [
        ...prev,
        { from: connectionStart, to: { compId, terminalId } },
      ]);
      updateComponent(connectionStart.compId, { selectedTerminal: null });
      setConnectionStart(null);
    }
  };

  // Check if the circuit is complete.
  const checkCircuit = () => {
    const graph = {};
    components.forEach((comp) => {
      const terms = terminalPositions[comp.type] || [];
      terms.forEach((t) => {
        const nodeId = comp.id + "_" + t.id;
        graph[nodeId] = [];
      });
    });
    connections.forEach((conn) => {
      const fromId = conn.from.compId + "_" + conn.from.terminalId;
      const toId = conn.to.compId + "_" + conn.to.terminalId;
      if (graph[fromId] && graph[toId]) {
        graph[fromId].push(toId);
        graph[toId].push(fromId);
      }
    });

    const batteryNodes = components
      .filter((c) => c.type === "battery")
      .flatMap((c) =>
        terminalPositions["battery"].map((t) => c.id + "_" + t.id)
      );
    const ledNodes = components
      .filter((c) => c.type === "led")
      .flatMap((c) => terminalPositions["led"].map((t) => c.id + "_" + t.id));
    const groundNodes = components
      .filter((c) => c.type === "ground")
      .flatMap((c) =>
        terminalPositions["ground"].map((t) => c.id + "_" + t.id)
      );

    let found = false;
    const visited = {};
    function dfs(node, reached) {
      visited[node] = true;
      if (ledNodes.includes(node)) reached.hasLED = true;
      if (groundNodes.includes(node)) reached.hasGround = true;
      graph[node].forEach((neighbor) => {
        if (!visited[neighbor]) dfs(neighbor, reached);
      });
    }
    for (let bNode of batteryNodes) {
      if (!graph[bNode]) continue;
      const reached = { hasLED: false, hasGround: false };
      dfs(bNode, reached);
      if (reached.hasLED && reached.hasGround) {
        found = true;
        break;
      }
    }

    // Compute total battery voltage.
    let totalVoltage = 0;
    components.forEach((comp) => {
      if (comp.type === "battery") totalVoltage += comp.value;
    });
    const brightness = Math.min(1, totalVoltage / 20);

    if (found) {
      setComponents((prev) =>
        prev.map((comp) => {
          if (comp.type === "led") return { ...comp, glow: true, brightness };
          return comp;
        })
      );
      const msg = generateMessage(totalVoltage);
      setMessage(msg);
    } else {
      setComponents((prev) =>
        prev.map((comp) => {
          if (comp.type === "led")
            return { ...comp, glow: false, brightness: 0 };
          return comp;
        })
      );
      setMessage(
        "Incomplete Circuit! Ensure a battery, an LED, and ground are connected."
      );
    }
  };

  const generateMessage = (totalVoltage) => {
    let totalResistance = 0,
      totalCapacitance = 0,
      totalInductance = 0;
    let countBattery = 0,
      countResistor = 0,
      countCapacitor = 0,
      countInductor = 0,
      countLED = 0;

    components.forEach((comp) => {
      switch (comp.type) {
        case "battery":
          countBattery++;
          break;
        case "resistor":
          totalResistance += comp.value;
          countResistor++;
          break;
        case "capacitor":
          totalCapacitance += comp.value;
          countCapacitor++;
          break;
        case "inductor":
          totalInductance += comp.value;
          countInductor++;
          break;
        case "led":
          countLED++;
          break;
        default:
          break;
      }
    });

    if (totalVoltage >= 15 && totalResistance < 5) {
      return "Your energy is electrifying and unstoppable!";
    } else if (totalResistance > 50) {
      return "You’ve overcome massive resistance – keep shining!";
    } else if (totalCapacitance > 20) {
      return "Your memory stores endless potential. Keep evolving!";
    } else if (totalInductance > 10) {
      return "Slow and steady growth leads to amazing results.";
    } else if (totalVoltage < 5) {
      return "A gentle spark of passion. Keep fueling your dreams!";
    } else {
      return "Every component of you matters. Embrace your unique journey!";
    }
  };

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData("componentType", type);
  };

  return (
    <div>
      <Toolbox onDragStart={handleDragStart} />
      <Breadboard
        components={components}
        addComponent={addComponent}
        updateComponent={updateComponent}
        connections={connections}
        initiateTerminalConnection={initiateTerminalConnection}
        removeComponent={removeComponent}
      />
      <DigitalDisplay message={message} />
      <ToggleSwitch checkCircuit={checkCircuit} />
    </div>
  );
}

export default App;
