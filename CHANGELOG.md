# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-07-29

### Added

- Analysis panel: optional FLASH maximum overlap (`-M`) override. Detects R1 read length during species detection as a UI upper bound, and clamps the override server-side to a safe range when joining paired-end reads.

---

## [1.2.1] - 2026-07-22

### Fixed

- Fixed haplotype network PNG export being cropped and low-resolution on Retina/HiDPI displays.
- Fixed haplotype network edge lines being invisible in dark theme (previously hardcoded to black).

---

## [1.2.0] - 2026-07-19

### Added

- Replaced PEAR with FLASH (v1.2.11) for merging paired-end reads, since PEAR's license is not compatible with the project's publication requirements.

### Changed

- FLASH is now configured to automatically match PEAR's merge behavior on amplicon data by detecting each dataset's read length and enabling outie-orientation overlaps, avoiding the silent under-merging that occurs with FLASH's out-of-the-box defaults on this project's data.
- Completed the remaining "MEVP" branding cleanup to "eDNA WorkBench" (app logo, license header).
- Local packaging (`dist`/`dist:all`) now automatically cleans previous build artifacts before building.

### Fixed

- Fixed a bug where non-fatal diagnostic output from the analysis container (e.g. tool version banners printed on startup) was incorrectly reported as a pipeline failure, causing the app to prematurely reset mid-analysis.

---

## [1.1.2] - 2026-06-23

### Changed

- In-app user guides updated: `analysis.md`, `haplotype.md`, `phylotree.md`, `sequence-alignment.md` (clearer descriptions, refined workflow notes, and added ASV reduce tool explanation). (#36)

---

## [1.1.1] - 2026-06-23

### Fixed

- Haplotype Network (CVSTable): "All ASV" and "All Location" buttons (and their adjacent Clear buttons) were swapped, causing each button to operate on the wrong selection. They now correctly select/clear ASVs and locations as labeled. (#41)

---

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
