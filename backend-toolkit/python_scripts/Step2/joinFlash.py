#!/usr/bin/env python3

import subprocess
import os
import sys
# import logging
from pathlib import Path

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 1)

class FLASHTools:
    """FLASH (Fast Length Adjustment of SHort reads) Tool Wrapper"""

    def __init__(self):
        # -- check if running in Docker environment
        self.in_docker = os.path.exists("/app") and os.path.exists("/.dockerenv")

        self.trim_output_dir = "/app/data/outputs/trim"
        self.flash_output_dir = "/app/data/outputs/flash"

    def run_command(self, cmd, cwd=None, capture_output=True):
        try:
            print(f"Executing: {' '.join(cmd)}", flush=True)

            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=capture_output,
                text=True,
                check=True
            )

            return result

        except subprocess.CalledProcessError as e:
            print(f"Command failed: {' '.join(cmd)}", flush=True)
            print(f"Error: {e.stderr}", flush=True)
            raise

    @staticmethod
    def _detect_read_length(fastq_file):
        """Read the length of the first sequence in a FASTQ file."""
        try:
            with open(fastq_file, 'r') as f:
                f.readline()  # header
                seq = f.readline().strip()
                return len(seq) if seq else None
        except Exception:
            return None

    def flash_join(self, forward_file, reverse_file, output_dir, output_prefix, threads=4):
        """
        Args:
            forward_file: R1 file path (*.f.fq)
            reverse_file: R2 file path (*.r.fq)
            output_dir: Directory to write output files into
            output_prefix: Output file prefix (e.g. species name)
            threads: Number of worker threads
        """
        if not self.in_docker:
            self.logger.warning("FLASH can only be executed within Docker container")
            print("Warning: FLASH can only be executed within Docker container", flush=True)
            return None

        # -- This pipeline's amplicons are frequently shorter than the read
        # length, so R1/R2 read through into each other's adapter/primer
        # region ("outie" overlap). FLASH's defaults (-O off, -M 65bp) assume
        # a classic ~180bp shotgun fragment library and will silently
        # under-merge amplicon data. Allow outies and size the max overlap to
        # the actual read length so the full overlap region is scored.
        read_len = self._detect_read_length(forward_file)
        max_overlap = read_len if read_len else 300

        cmd = [
            'flash',
            str(forward_file),
            str(reverse_file),
            '-d', str(output_dir),
            '-o', str(output_prefix),
            '-M', str(max_overlap),
            '-O',
            '-t', str(threads)
        ]

        self.run_command(cmd)

        # -- return expected output files (FLASH's default naming scheme)
        prefix_path = f"{output_dir}/{output_prefix}"
        return {
            'assembled': f"{prefix_path}.extendedFrags.fastq",
            'unassembled_forward': f"{prefix_path}.notCombined_1.fastq",
            'unassembled_reverse': f"{prefix_path}.notCombined_2.fastq",
            'hist': f"{prefix_path}.hist",
            'histogram': f"{prefix_path}.histogram"
        }

def run_flash_analysis():
    tools = FLASHTools()

    print("=" * 40, flush=True)
    print("FLASH v1.2.11", flush=True)

    print(f"\nFLASH output directory: {tools.flash_output_dir}", flush=True)

    # -- find all .f.fq and .r.fq files
    species_files = []
    trim_path = Path(tools.trim_output_dir)

    print(f"Scanning trim output directory: {tools.trim_output_dir}", flush=True)

    for f_file in trim_path.glob("*.f.fq"):
        species_name = f_file.stem.replace('.f', '')
        r_file = f_file.parent / f"{species_name}.r.fq"

        if r_file.exists():
            species_files.append({
                'species': species_name,
                'forward': str(f_file),
                'reverse': str(r_file)
            })

            # -- check file size and sequence count
            try:
                with open(f_file, 'r') as f:
                    f_lines = sum(1 for line in f)
                with open(r_file, 'r') as f:
                    r_lines = sum(1 for line in f)

                f_seqs = f_lines // 4
                r_seqs = r_lines // 4

                print(f"Found project: {species_name}", flush=True)
                print(f"  Forward: {f_file.name} ({f_seqs} sequences)", flush=True)
                print(f"  Reverse: {r_file.name} ({r_seqs} sequences)", flush=True)

            except Exception as e:
                print(f"Error reading files for {species_name}: {e}", flush=True)
                continue
        else:
            print(f"Warning: Missing reverse file for {species_name}: {r_file}", flush=True)

    if not species_files:
        print("No species files found in trim output directory", flush=True)
        return {}

    # -- process each species
    results = {}
    for species_data in species_files:
        species = species_data['species']
        print(f"\n{'='*30}", flush=True)
        print(f"Processing project: {species}", flush=True)
        print(f"{'='*30}", flush=True)

        try:
            # -- FLASH
            flash_results = tools.flash_join(
                forward_file=species_data['forward'],
                reverse_file=species_data['reverse'],
                output_dir=tools.flash_output_dir,
                output_prefix=species
            )

            if flash_results:
                print(f"{species} FLASH completed successfully", flush=True)

                # results
                for file_type, filename in flash_results.items():
                    filepath = Path(filename)
                    if filepath.exists():
                        # 計算序列數量
                        seq_count = 0
                        try:
                            with open(filepath, 'r') as f:
                                for line_num, line in enumerate(f):
                                    if line_num % 4 == 0:  # FASTQ header
                                        seq_count += 1
                        except:
                            seq_count = "unknown"

                        file_size = filepath.stat().st_size
                        print(f"  {file_type}: {filepath.name} ({seq_count} sequences, {file_size} bytes)", flush=True)
                    else:
                        print(f"  {file_type}: {filepath.name} (file not generated)", flush=True)

                results[species] = flash_results

        except Exception as e:
            print(f"Processing failed for {species}: {e}", flush=True)
            continue

    print(f"FLASH processing completed", flush=True)

    return results

def list_available_files():
    print("Checking directory structure...", flush=True)

    # 檢查 trim 輸出目錄
    trim_dir = "/app/data/outputs/trim"
    if os.path.exists(trim_dir):
        print(f"\nTrim output directory: {trim_dir}", flush=True)
        files = sorted(Path(trim_dir).glob("*"))
        if files:
            for file in files:
                size = file.stat().st_size if file.exists() else 0
                print(f"  {file.name} ({size} bytes)", flush=True)
        else:
            print("  (empty directory)", flush=True)
    else:
        print(f"Trim output directory does not exist: {trim_dir}", flush=True)

    # 檢查 flash 輸出目錄
    flash_dir = "/app/data/outputs/flash"
    if os.path.exists(flash_dir):
        print(f"\nFLASH output directory: {flash_dir}", flush=True)
        files = sorted(Path(flash_dir).glob("*"))
        if files:
            for file in files:
                size = file.stat().st_size if file.exists() else 0
                print(f"  {file.name} ({size} bytes)", flush=True)
        else:
            print("  (empty directory)", flush=True)
    else:
        print(f"FLASH output directory: {flash_dir} (will be created)", flush=True)

def main():
    list_available_files()
    print(flush=True)
    results = run_flash_analysis()

if __name__ == "__main__":
    main()
