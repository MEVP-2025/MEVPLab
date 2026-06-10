# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-06-10

### Added
- HomePage: replace old asset images with new home-themed images and update CSS references

### Fixed
- SidebarRight: comment out Sort Order control for future use, simplifying the current UI

---

## [1.0.0] - 2026-06-10

Initial tagged release.

### Features
- eDNA analysis pipeline with Docker-based 11-step processing
- Sequence alignment viewer with editing, deletion, and undo/redo
- Phylogenetic tree visualization (v2) with Newick export and PNG export
- Haplotype network visualization
- Dynamic API URL configuration and backend port management
- Drag-to-resize panel in sequence alignment view
- Collapsible sidebars and pan/zoom UI for phylotree
- Branch-length axis display
- Archive extraction support (ZIP, 7z, tar.gz)

### Fixed
- Phylotree branch length and internal node fill colors
- macOS navbar offset for hidden title bar
- Windows/Linux x64 arch build configuration
