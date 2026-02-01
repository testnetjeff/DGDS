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
- **Closed shape profiles** - curves automatically connect last to first anchor
- **Edit modes**: Select (pointer), Add (+), and Delete (-) tools
- Dynamic point manipulation with visual feedback and mode indicators

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
- 2026-02-01: Added closed shape profiles with edit tools
  - Closed loop Bezier curves (last anchor connects to first)
  - Add anchor point tool (+) for inserting new points
  - Delete anchor point tool (-) for removing points (minimum 3 required)
  - Visual mode indicators and cursor feedback
  - Improved seam handling for consistent curve closure
- 2026-02-01: Added landing page with company branding
  - Alumicube Engineering logo prominently displayed
  - Animated loading bar with system status messages
  - "Start Designing" button with blue glow effects
  - Particle effects background matching industrial theme
  - Smooth transition to main application
  - Home button in toolbar to return to landing page
- 2026-02-01: Added Copy Profile feature and custom default shape
  - Copy Profile button exports current coordinates to clipboard as JSON
  - Updated default disc profile with user's custom design

## Future Roadmap

- Undo/redo functionality
- Profile save/load system
- Measurement tools
- Profile library with templates
- CFD simulation module
- Electron desktop wrapper
