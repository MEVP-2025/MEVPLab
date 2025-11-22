// src/data/mapImages.js 
import TW1 from "../../../assets/haplotype/TW.png";
import TW2 from "../../../assets/haplotype/japan-map.png";
import TW3 from "../../../assets/haplotype/world-map.png";

export const mapImages = [
  {
    id: "tw1",
    name: "Taiwan-Map",
    src: TW1,
    defaultLonRange: [120, 122],
    defaultLatRange: [21.5, 25.5],
    lonDirMin: "E",
    lonDirMax: "E",
    latDirMin: "N",
    latDirMax: "N",
  },
  {
    id: "japan",
    name: "Japan-Map",
    src: TW2,
    defaultLonRange: [122.56, 153.59],
    defaultLatRange: [20.25, 45.31],
    lonDirMin: "E",
    lonDirMax: "E",
    latDirMin: "N",
    latDirMax: "N",
  },
  {
    id: "world",
    name: "World-Map",
    src: TW3,
    defaultLonRange: [180, 180],
    defaultLatRange: [90, 90],
    lonDirMin: "W",
    lonDirMax: "E",
    latDirMin: "S",
    latDirMax: "N",
  },
  
];
