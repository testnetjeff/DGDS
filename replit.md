# Disc Golf Design Studio

A specialized CAD tool for designing disc golf disc cross-sectional profiles with 3D visualization and STL export capabilities.

## Overview

This application allows users to:
- Design disc golf disc profiles using 2D Bezier curves
- Generate 3D models via surface of revolution (lathe geometry)
- Export designs as STL files for manufacturing
- Validate designs against PDGA compliance rules

## Tech Stack

- **Frontend Framework**: React 19 with Vite
- **3D Rendering**: Three.js with React Three Fiber
- **Styling**: CSS with custom Alumicube Industrial theme
- **Architecture**: Web-based (ready for Electron desktop wrapper)

## Project Structure

```
src/
├── components/
│   ├── Canvas2D.jsx       # 2D profile editor with Bezier curves
│   ├── Viewer3D.jsx       # 3D model viewer with Three.js
│   ├── Toolbar.jsx        # Main navigation and controls
│   ├── ColorPicker.jsx    # Spectrum box for model coloring
│   ├── Tutorial.jsx       # First-launch tutorial overlay
│   ├── CFDPlaceholder.jsx # Placeholder for future CFD module
│   └── StatusBar.jsx      # Status and PDGA mode indicator
├── utils/
│   ├── bezier.js          # Bezier curve mathematics
│   ├── geometry.js        # Lathe geometry and STL export
│   └── pdgaConstraints.js # PDGA compliance validation
├── styles/
│   └── global.css         # Global theme and variables
├── App.jsx                # Main application component
└── main.jsx               # React entry point
```

## Key Features

### 2D Designer (Drafting Table)
- Grid-based canvas for profile editing
- Draggable control points and handles
- Ghost overlay of reference disc for scale comparison
- Real-time Bezier curve rendering

### PDGA Compliance Mode
- Toggle to enable/disable constraint enforcement
- Limits diameter, height, and rim dimensions
- Visual feedback (orange) when constraints are hit

### 3D Generator (Inspection Deck)
- Lathe geometry for 360° surface of revolution
- Premium plastic shader with specular highlights
- Interactive orbit controls for inspection
- Spectrum color picker for model tinting

### STL Export
- Low/Medium/High resolution options
- ASCII STL format for broad compatibility

## Design Language

**Theme**: Alumicube Industrial
- Carbon Black backgrounds (#0a0a0a)
- Sentient Steel Blue accents (#8294A1)
- Cubeular Orange warnings (#FF8700)
- Floating semi-transparent toolbars

**System Voice**: TARS-lite (dry, helpful, robotic engineering humor)

## Running the Project

```bash
npm install
npm run dev
```

The application runs on port 5000.

## Recent Changes

- 2026-02-01: Initial implementation with all core features
  - 2D Bezier curve editor
  - 3D lathe geometry visualization
  - STL export functionality
  - PDGA compliance mode
  - Alumicube Industrial theme
  - Tutorial overlay and CFD placeholder

## Future Roadmap

- Undo/redo functionality
- Profile save/load system
- Measurement tools
- Profile library with templates
- CFD simulation module
- Electron desktop wrapper
