# MSA Viewer
An interactive viewer for reviewing and editing **column-wise** multiple sequence alignments.

**Input:**
*   **Alignment File:** A FASTA format file, where all sequences must have the same length (e.g., `msa.fa`).

**Output:**
*   **Left box:** Read defline
*   **Main box:** Column-based nucleotide sequences

**Configurations:**
*   **Visualization:** Nucleotides are color-coded for easy viewing.
*   **Edit:** Tick/select specific column(s) to perform edit operations on characters.
*   **Undo/Redo:** Use "Previous step" to undo the last operation and "Recover" to redo it.
*   **Search:** Locate specific DNA patterns or read IDs within the alignment.
