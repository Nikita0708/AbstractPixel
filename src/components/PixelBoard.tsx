declare global {
  interface Window {
    ethereum: any;
    zerionWallet: any;
    rabby: any;
    trustwallet: any;
    coinbaseWallet: any;
  }
}

import React, { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import { ethers } from "ethers";
import Leaderboard from "./Leaderboard";
import WalletModal from "./modals/WalletModal";
import { Tabs, Tab, Card, Spinner } from "@heroui/react";

// navbar related

import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { TwitterIcon } from "@/components/icons";
import { useStatusNotification } from "./notifications/Notification";

const CONTRACT_ADDRESS = "0x487C44911853d915A0385FF71cb23C17A02FdFd2";
const FEE_RECIPIENT = "0x5255eF6956a77143D3F18978555c6cdCd4F2aA0A";
const FIXED_FEE_PER_PIXEL = ethers.parseEther("0.00003");

// Update the CONTRACT_ABI constant
const CONTRACT_ABI = [
  "function paintPixels(bytes32 pixelsHash, uint256 numPixels) external payable",
  "event PixelsPainted(address indexed user, bytes32 pixelsHash, uint256 timestamp, bytes32 transactionId)",
  "function withdrawFees() external",
];

const socket = io("https://abstract-backend.onrender.com", {
  transports: ["websocket"],
  reconnectionAttempts: 5,
});

const vertexShaderSource = `
  attribute vec2 a_position;
    attribute vec3 a_color;
    varying vec3 v_color;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    uniform float u_scale;

    void main() {
      vec2 scaledPosition = a_position * u_scale * 2.0; 
      vec2 position = scaledPosition + u_translation;
      vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_color = a_color;
      gl_PointSize = 4.0 * u_scale; 
    }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec3 v_color;

  void main() {
    gl_FragColor = vec4(v_color, 1);
  }
`;

// Memoize helper functions
const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) => {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
};

// Memoize color conversion
const hexToRGB = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
};

type Pixel = {
  _id: string;
  position: { x: number; y: number };
  color: string;
};

const PixelBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [color, setColor] = useState("#000000");
  const [scale, setScale] = useState(1);
  const [translation, setTranslation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState("draw");
  const [isSelecting, setIsSelecting] = useState(false); // For shift-selection
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Add this with your other state declarations
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [walletAddress, setWalletAddress] = useState(() => {
    return localStorage.getItem("walletAddress") || "";
  });
  const [chainId, setChainId] = useState<any>(null);
  const [txPending, setTxPending] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const { showNotification } = useStatusNotification();

  const handleModeChange = (value: any) => {
    setMode(value);
  };

  const initializeWeb3 = useCallback(async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setChainId(network.chainId);

        // Check if we're on Abstract testnet
        if (network.chainId !== BigInt(11124)) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x2B74",
                  chainName: "Abstract Testnet",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://api.testnet.abs.xyz"],
                  blockExplorerUrls: ["https://sepolia.abscan.org/"],
                },
              ],
            });
          } catch (error) {
            console.error("Failed to add Abstract testnet:", error);
            showNotification("Please switch to Abstract Testnet", "error");
            return false;
          }
        }

        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        const address = await signer.getAddress();
        setIsAdmin(address.toLowerCase() === FEE_RECIPIENT.toLowerCase());

        // Register/update user in backend
        try {
          const response = await fetch(
            "https://abstract-backend.onrender.com/users",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                walletAddress: address,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to register user");
          }

          const userData = await response.json();
          console.log("User registered:", userData);
        } catch (error) {
          console.error("Error registering user:", error);
          // Continue anyway as this isn't critical
        }

        setProvider(provider);
        setSigner(signer);
        setContract(contract);
        setWalletAddress(address);
        localStorage.setItem("walletAddress", address);

        // Setup event listeners
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        showNotification("Wallet connected successfully", "success");
        return true;
      } catch (error) {
        console.error("Failed to initialize Web3:", error);
        showNotification("Failed to connect wallet", "error");
        localStorage.removeItem("walletAddress");
        setIsAdmin(false);
        return false;
      }
    } else {
      showNotification("Please install MetaMask", "error");
      localStorage.removeItem("walletAddress");
      setIsAdmin(false);
      return false;
    }
  }, []);

  const handleAccountsChanged = async (accounts: any) => {
    if (accounts.length === 0) {
      setWalletAddress("");
      setSigner(null);
      setContract(null);
      showNotification("Wallet disconnected", "success");
      localStorage.removeItem("walletAddress");
      setIsAdmin(false);
    } else {
      const newAddress = accounts[0];

      setIsAdmin(newAddress.toLowerCase() === FEE_RECIPIENT.toLowerCase());

      // Register/update new account
      try {
        await fetch("https://abstract-backend.onrender.com/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: newAddress,
          }),
        });
      } catch (error) {
        console.error("Error registering new account:", error);
        // Continue anyway
      }

      setWalletAddress(newAddress);
      localStorage.setItem("walletAddress", newAddress);

      if (provider) {
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        setContract(
          new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner)
        );
      }
    }
  };

  const handleWithdraw = async () => {
    if (!contract || isWithdrawing) return;

    try {
      setIsWithdrawing(true);
      showNotification("Withdrawing fees...");

      const tx = await contract.withdrawFees();
      showNotification("Withdrawal transaction pending...");

      await tx.wait();
      showNotification("Fees withdrawn successfully!", "success");
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      showNotification("Failed to withdraw fees: " + error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleChainChanged = () => {
    if (chainId !== "0x2B74") {
      showNotification("Please switch to Abstract Testnet", "error");
    }
    window.location.reload();
  };

  const connectWallet = async (walletType: string) => {
    try {
      let provider;

      switch (walletType) {
        case "metamask":
          if (!window.ethereum) {
            window.open("https://metamask.io/download.html", "_blank");
            return;
          }
          provider = window.ethereum;
          break;

        case "zerion":
          if (!window.zerionWallet) {
            window.open("https://zerion.io/wallet", "_blank");
            return;
          }
          provider = window.zerionWallet;
          break;

        case "rabby":
          if (!window.rabby) {
            window.open("https://rabby.io", "_blank");
            return;
          }
          provider = window.rabby;
          break;

        case "trust":
          if (!window.trustwallet) {
            window.open("https://trustwallet.com/browser-extension", "_blank");
            return;
          }
          provider = window.trustwallet;
          break;

        case "coinbase":
          if (!window.coinbaseWallet) {
            window.open("https://www.coinbase.com/wallet/downloads", "_blank");
            return;
          }
          provider = window.coinbaseWallet;
          break;

        default:
          throw new Error("Unsupported wallet type");
      }

      // Request account access
      await provider.request({ method: "eth_requestAccounts" });

      // Get current chain ID
      const currentChainId = await provider.request({ method: "eth_chainId" });
      setChainId(currentChainId);

      // Check if we need to switch chains
      if (currentChainId !== "0x2B74") {
        // Abstract testnet
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x2B74" }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x2B74",
                  chainName: "Abstract Testnet",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://api.testnet.abs.xyz"],
                  blockExplorerUrls: ["https://sepolia.abscan.org/"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }

        // Update chainId after switching
        const newChainId = await provider.request({ method: "eth_chainId" });
        setChainId(newChainId);
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();

      // Create contract instance
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Set state
      setProvider(ethersProvider);
      setSigner(signer);
      setContract(contract);
      setWalletAddress(address);
      setIsAdmin(address.toLowerCase() === FEE_RECIPIENT.toLowerCase());
      localStorage.setItem("walletAddress", address);

      // Register user
      try {
        const response = await fetch(
          "https://abstract-backend.onrender.com/users",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              walletAddress: address,
            }),
          }
        );

        if (!response.ok) {
          console.error("Failed to register user");
        }
      } catch (error) {
        console.error("Error registering user:", error);
      }

      // Setup event listeners
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", (newChainId: string) => {
        setChainId(newChainId);
        handleChainChanged();
      });

      showNotification("Wallet connected successfully", "success");
      setIsWalletModalOpen(false);
      return true;
    } catch (error: any) {
      console.error("Failed to initialize wallet:", error);
      showNotification("Failed to connect wallet: " + error.message, "error");
      localStorage.removeItem("walletAddress");
      setIsAdmin(false);
      return false;
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setSigner(null);
    setContract(null);
    showNotification("Wallet disconnected", "success");

    localStorage.removeItem("walletAddress");
    setIsAdmin(false);

    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    }
  };

  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      initializeWeb3().catch((error) => {
        console.error("Auto-connect failed:", error);
        localStorage.removeItem("walletAddress");
        setWalletAddress("");
      });
    }
  }, []);

  // Existing useEffect for fetching pixels remains the same
  useEffect(() => {
    const fetchPixels = async () => {
      try {
        const res = await fetch("https://abstract-backend.onrender.com/pixels");
        const data = await res.json();
        setPixels(data);
      } catch (error) {
        console.error("Failed to fetch pixels:", error);
      }
    };
    fetchPixels();

    const handleUpdatePixels = (updatedPixels: Pixel[]) => {
      setPixels((prev) => {
        const pixelMap = new Map(prev.map((p) => [p._id, p]));
        updatedPixels.forEach((pixel) => pixelMap.set(pixel._id, pixel));
        return Array.from(pixelMap.values());
      });
    };

    socket.on("updatePixels", handleUpdatePixels);
    return () => {
      socket.off("updatePixels", handleUpdatePixels);
    };
  }, []);

  // WebGL setup useEffect remains unchanged

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (pixels.length > 0) {
      const minX = Math.min(...pixels.map((p) => p.position.x));
      const minY = Math.min(...pixels.map((p) => p.position.y));
      const maxX = Math.max(...pixels.map((p) => p.position.x));
      const maxY = Math.max(...pixels.map((p) => p.position.y));

      const width = (maxX - minX) * 2;
      const height = (maxY - minY) * 2;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    const program = createProgram(
      gl,
      vertexShader as any,
      fragmentShader as any
    );

    gl.useProgram(program);
    programRef.current = program;

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const colorLocation = gl.getAttribLocation(program, "a_color");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const translationLocation = gl.getUniformLocation(program, "u_translation");
    const scaleLocation = gl.getUniformLocation(program, "u_scale");

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(translationLocation, translation.x, translation.y);
    gl.uniform1f(scaleLocation, scale);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
  }, [pixels, translation, scale]);

  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const colorBufferRef = useRef<WebGLBuffer | null>(null);

  // Modified rendering useEffect
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !programRef.current) return;

    if (!positionBufferRef.current) {
      positionBufferRef.current = gl.createBuffer();
    }
    if (!colorBufferRef.current) {
      colorBufferRef.current = gl.createBuffer();
    }

    const positions = new Float32Array(pixels.length * 2);
    const colors = new Float32Array(pixels.length * 3);

    pixels.forEach((pixel, i) => {
      positions[i * 2] = pixel.position.x;
      positions[i * 2 + 1] = pixel.position.y;

      const pixelColor = selected.includes(pixel._id)
        ? hexToRGB(color)
        : hexToRGB(pixel.color);
      colors[i * 3] = pixelColor[0];
      colors[i * 3 + 1] = pixelColor[1];
      colors[i * 3 + 2] = pixelColor[2];
    });

    const positionLocation = gl.getAttribLocation(
      programRef.current,
      "a_position"
    );
    const colorLocation = gl.getAttribLocation(programRef.current, "a_color");
    const translationLocation = gl.getUniformLocation(
      programRef.current,
      "u_translation"
    );
    const scaleLocation = gl.getUniformLocation(programRef.current, "u_scale");

    gl.uniform2f(translationLocation, translation.x, translation.y);
    gl.uniform1f(scaleLocation, scale);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, pixels.length);
  }, [pixels, selected, color, translation, scale]);

  // Rendering logic useEffect remains unchanged

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (event: WheelEvent) => {
      if (mode !== "navigate") return;

      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(1, Math.min(10, scale * zoomFactor));

      const newTranslation = {
        x: mouseX - (mouseX - translation.x) * (newScale / scale),
        y: mouseY - (mouseY - translation.y) * (newScale / scale),
      };

      const minX = -canvas.width * (newScale - 1);
      const maxX = 0;
      const minY = -canvas.height * (newScale - 1);
      const maxY = 0;

      setTranslation({
        x: Math.min(maxX, Math.max(minX, newTranslation.x)),
        y: Math.min(maxY, Math.max(minY, newTranslation.y)),
      });
      setScale(newScale);
    };

    // Add non-passive wheel event listener
    canvas.addEventListener("wheel", wheelHandler, { passive: false });

    // Clean up
    return () => {
      canvas.removeEventListener("wheel", wheelHandler);
    };
  }, [scale, translation, mode]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "navigate") return; // Only drag in navigate mode
      setIsDragging(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
    },
    [mode]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (mode === "navigate" && isDragging) {
        // Handle navigation dragging
        const dx = event.clientX - lastMousePos.x;
        const dy = event.clientY - lastMousePos.y;

        setTranslation((prev) => {
          const minX = -canvas.width * (scale - 1);
          const maxX = 0;
          const minY = -canvas.height * (scale - 1);
          const maxY = 0;

          const newX = Math.min(maxX, Math.max(minX, prev.x + dx));
          const newY = Math.min(maxY, Math.max(minY, prev.y + dy));

          return { x: newX, y: newY };
        });
        setLastMousePos({ x: event.clientX, y: event.clientY });
      } else if (isAdmin && mode === "draw" && isSelecting) {
        // Handle area selection for admin
        const rect = canvas.getBoundingClientRect();
        const currentX =
          Math.round(
            (event.clientX - rect.left - translation.x) / (scale * 2)
          ) + 1.8;
        const currentY =
          Math.round((event.clientY - rect.top - translation.y) / (scale * 2)) +
          1.8;

        // Find all pixels within the selection rectangle
        const minX = Math.min(selectionStart.x, currentX);
        const maxX = Math.max(selectionStart.x, currentX);
        const minY = Math.min(selectionStart.y, currentY);
        const maxY = Math.max(selectionStart.y, currentY);

        const selectedPixels = pixels.filter(
          (pixel) =>
            pixel.position.x >= minX &&
            pixel.position.x <= maxX &&
            pixel.position.y >= minY &&
            pixel.position.y <= maxY
        );

        setSelected(selectedPixels.map((p) => p._id));
      }
    },
    [
      mode,
      isDragging,
      lastMousePos,
      scale,
      isSelecting,
      selectionStart,
      pixels,
      isAdmin,
      translation,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSelecting(false);
        if (isAdmin) {
          setSelected([]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "draw" || isDragging || !walletAddress) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x =
        Math.round((event.clientX - rect.left - translation.x) / (scale * 2)) +
        1.8;
      const y =
        Math.round((event.clientY - rect.top - translation.y) / (scale * 2)) +
        1.8;

      if (isAdmin && event.shiftKey) {
        setIsSelecting(true);
        setSelectionStart({ x, y });
      } else {
        const clickedPixel = pixels.find(
          (p) =>
            Math.abs(p.position.x - x) < 2 && Math.abs(p.position.y - y) < 2
        );

        if (clickedPixel && !selected.includes(clickedPixel._id)) {
          if (!isAdmin && selected.length >= 10) return;
          setSelected((prev) => [...prev, clickedPixel._id]);
        }
      }
    },
    [
      pixels,
      selected,
      translation,
      scale,
      mode,
      isDragging,
      isAdmin,
      walletAddress,
    ]
  );

  const handleSend = useCallback(async () => {
    if (selected.length === 0 || !contract || !signer || txPending) return;

    try {
      // Convert chainId to lowercase hex string for consistent comparison
      const currentChainId =
        typeof chainId === "bigint"
          ? "0x" + chainId.toString(16)
          : (chainId || "").toLowerCase();

      const targetChainId = "0x2b74"; // Abstract testnet in lowercase

      console.log("Current chain ID:", currentChainId);
      console.log("Target chain ID:", targetChainId);

      if (currentChainId !== targetChainId) {
        // Try to switch to Abstract testnet
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x2B74" }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x2B74",
                  chainName: "Abstract Testnet",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://api.testnet.abs.xyz"],
                  blockExplorerUrls: ["https://sepolia.abscan.org/"],
                },
              ],
            });
          } else {
            throw new Error("Failed to switch to Abstract Testnet");
          }
        }
        return; // Exit after chain switch attempt
      }

      setTxPending(true);
      showNotification("Preparing transaction...");

      const userAddress = await signer.getAddress();
      const totalFee =
        userAddress.toLowerCase() === FEE_RECIPIENT.toLowerCase()
          ? BigInt(0)
          : FIXED_FEE_PER_PIXEL * BigInt(selected.length);

      const pixelsHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "string[]", "string"],
          [userAddress, selected, color]
        )
      );

      const tx = await contract.paintPixels(pixelsHash, selected.length, {
        value: totalFee,
      });

      showNotification("Transaction pending...");
      const receipt = await tx.wait();

      // Emit socket event for real-time updates
      socket.emit("paintPixels", {
        pixels: selected,
        color,
        transactionHash: receipt.hash,
        userAddress: userAddress,
      });

      // Update user statistics in backend
      try {
        await fetch("https://abstract-backend.onrender.com/users/stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: userAddress,
            pixelsPainted: selected.length,
            transactionHash: receipt.hash,
            fee: totalFee.toString(),
          }),
        });
      } catch (error) {
        console.error("Error updating user statistics:", error);
        // Continue anyway as this isn't critical
      }

      // Update local state
      setPixels((prev) =>
        prev.map((pixel) =>
          selected.includes(pixel._id) ? { ...pixel, color } : pixel
        )
      );

      setSelected([]);
      showNotification("Pixels updated successfully!", "success");
    } catch (error: any) {
      console.error("Error:", error);
      showNotification("Failed to update pixels: " + error.message, "error");
    } finally {
      setTxPending(false);
    }
  }, [
    selected,
    color,
    contract,
    signer,
    chainId,
    txPending,
    socket,
    setPixels,
    showNotification,
  ]);

  const handleSelectionReset = useCallback(() => {
    setSelected([]);
  }, []);

  const handlePositionReset = useCallback(() => {
    setScale(1);
    setTranslation({ x: 0, y: 0 });
  }, []);

  return (
    <div>
      <HeroUINavbar maxWidth="xl" position="sticky">
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <NavbarBrand className="gap-3 max-w-fit">
            <Link
              className="flex justify-start items-center gap-1"
              color="foreground"
              href="/"
            >
              <img src="/abstract-logo.png" alt="logo" className="w-[80px]" />
            </Link>
          </NavbarBrand>
          <div className="hidden sm:flex gap-4 justify-start ml-2">
            {siteConfig.navItems.map((item) => (
              <NavbarItem key={item.href}>
                <Link
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "data-[active=true]:text-primary data-[active=true]:font-medium"
                  )}
                  color="foreground"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </NavbarItem>
            ))}
          </div>
        </NavbarContent>

        <NavbarContent
          className="hidden sm:flex basis-1/5 sm:basis-full"
          justify="end"
        >
          <NavbarItem className="hidden sm:flex gap-2">
            <Link isExternal href={siteConfig.links.twitter} title="Twitter">
              <TwitterIcon className="text-default-500" />
            </Link>
          </NavbarItem>
          <NavbarItem>
            {!walletAddress ? (
              <Button
                onPress={() => setIsWalletModalOpen(true)}
                color="success"
              >
                Connect Wallet
              </Button>
            ) : (
              <>
                <span className="mr-[9px]">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <Button onPress={disconnectWallet} color="danger">
                  Disconnect
                </Button>
              </>
            )}
          </NavbarItem>
        </NavbarContent>
      </HeroUINavbar>

      <section className="container mt-[50px]">
        <h1 className="text-center">In Abstract We Trust</h1>
      </section>

      <div className="mt-[100px]">
        <div>
          <div className="flex justify-between">
            {pixels.length > 0 ? (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="border border-gray-300 bg-transparent"
                  style={{
                    cursor: isDragging
                      ? "grabbing"
                      : mode === "draw"
                        ? isSelecting
                          ? "crosshair"
                          : "pointer"
                        : "grab",
                  }}
                />
              </div>
            ) : (
              <Card
                radius="none"
                className="w-[598px] h-[598px] flex items-center justify-center"
              >
                <Spinner color="success" label="Pixels are being loaded..." />
              </Card>
            )}

            <div className="flex flex-col justify-around">
              {walletAddress && (
                <div>
                  <div className="grid grid-cols-6 gap-[30px]">
                    {[
                      { name: "Red", hex: "#F21A1A" },
                      { name: "Orange", hex: "#FFAE56" },
                      { name: "Yellow", hex: "#FFE556" },
                      { name: "Green", hex: "#53D146" },
                      { name: "Blue", hex: "#18189C" },
                      { name: "Purple", hex: "#630994" },
                      { name: "Pink", hex: "#D32998" },
                      { name: "White", hex: "#FFFFFF" },
                      { name: "Gray", hex: "#656565" },
                      { name: "Brown", hex: "#662F00" },
                      { name: "Black", hex: "#000000" },
                      { name: "AbstractColor", hex: "#07c983" },
                    ].map((colorOption) => (
                      <button
                        key={colorOption.hex}
                        onClick={() => setColor(colorOption.hex)}
                        className={`w-[65px] h-[65px] rounded-lg border-2 transition-transform hover:scale-105 ${
                          color === colorOption.hex &&
                          "border-3 border-[#07c983]"
                        }`}
                        style={{
                          backgroundColor: colorOption.hex,
                        }}
                        title={colorOption.name}
                        aria-label={`Select ${colorOption.name} color`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-4 flex-wrap gap-4">
                <div className="flex  justify-between">
                  <Tabs
                    selectedKey={mode}
                    onSelectionChange={handleModeChange}
                    aria-label="Tabs colors"
                    color="success"
                    isVertical={true}
                    size="lg"
                  >
                    <Tab
                      key="draw"
                      value="draw"
                      title="Draw"
                      className="w-[230px]"
                    />
                    <Tab key="navigate" value="navigate" title="Navigate" />
                  </Tabs>
                  <div className="flex flex-col gap-[7px]">
                    <Button
                      onPress={handleSelectionReset}
                      className="w-[230px]"
                      color="warning"
                    >
                      Reset Selection
                    </Button>

                    <Button
                      onPress={handlePositionReset}
                      className="w-[230px]"
                      color="secondary"
                    >
                      Reset Position
                    </Button>
                  </div>
                </div>
                {isAdmin && (
                  <div className="text-gray-600">
                    Admin Mode: Hold Shift to select multiple pixels
                  </div>
                )}
              </div>
              <Button
                onPress={handleSend}
                disabled={!selected.length || txPending}
                color="success"
                className={` w-full ${
                  !selected.length || txPending
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {txPending
                  ? "Processing..."
                  : walletAddress?.toLowerCase() === FEE_RECIPIENT.toLowerCase()
                    ? "Paint (Free)"
                    : `Paint ${selected.length}
                    ${isAdmin ? "" : "/10"} (${ethers.formatEther(
                      FIXED_FEE_PER_PIXEL * BigInt(selected.length)
                    )} ETH)`}
              </Button>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className={`bg-purple-500 text-black px-4 py-2 rounded-lg transition-colors ${
                isWithdrawing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-purple-600"
              }`}
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw Fees"}
            </button>
          )}
        </div>

        {/* Add the Leaderboard component */}

        <WalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={connectWallet}
        />
      </div>
      <div className="md:w-96 mb-[100px]">
        <Leaderboard walletAddress={walletAddress} socket={socket} />
      </div>
    </div>
  );
};

export default PixelBoard;
