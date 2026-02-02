Disc Golf Design Studio

A specialized CAD tool for designing disc golf disc cross-sectional profiles with 3D visualization and STL export capabilities.

Features

    2D Bezier Profile Editor - Design disc profiles using intuitive control points and handles
    Closed Shape Geometry - Automatic curve closure for manufacturing-ready profiles
    3D Lathe Visualization - Real-time 360° surface of revolution preview
    STL Export - Export designs in Low/Medium/High resolution for 3D printing or CNC
    PDGA Compliance Mode - Validate designs against official regulations
    Pan & Zoom Navigation - Middle-mouse pan, scroll wheel zoom
    Custom Color Selection - Visualize your disc in any color

Getting Started

# Install dependencies
npm install
# Start development server
npm run dev

The application runs on http://localhost:5000
Controls
Drafting Table (2D Editor)
Control	Action
Left Click + Drag	Move control points
Middle Mouse	Pan viewport
Scroll Wheel	Zoom in/out
Select Tool (↖)	Drag points to edit
Add Tool (+)	Click to add anchor points
Delete Tool (-)	Click anchor to remove
Inspection Deck (3D Viewer)
Control	Action
Left Click + Drag	Orbit camera
Right Click + Drag	Pan camera
Scroll Wheel	Zoom
Design Workflow

    Name your design in the toolbar
    Edit the profile on the Drafting Table using Bezier curves
    Enable PDGA Compliance if designing for tournament play
    Generate 3D to preview the rotational geometry
    Select resolution and Export STL for manufacturing

Tech Stack

    React 19 + Vite
    Three.js with React Three Fiber
    Custom Bezier curve mathematics
    ASCII STL export

Theme

Alumicube Industrial - Carbon Black backgrounds, Sentient Steel Blue accents, and Cubeular Orange highlights.

Alumicube Engineering 2026 | Anomalous Materials
