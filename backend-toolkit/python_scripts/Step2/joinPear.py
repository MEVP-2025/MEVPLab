#!/usr/bin/env python3

import subprocess
import os
import sys
# import logging
from pathlib import Path

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 1)

class PEARTools:
    """PEAR Tool Wrapper"""
    
    def __init__(self):
        # -- check if running in Docker environment
        self.in_docker = os.path.exists("/app") and os.path.exists("/.dockerenv")
        
        self.trim_output_dir = "/app/data/outputs/trim"
        self.pear_output_dir = "/app/data/outputs/pear"
    
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
    
    def pear_join(self, forward_file, reverse_file, output_prefix, threads=4):
        """
        Args:
            forward_file: R1 file path (*.f.fq)
            reverse_file: R2 file path (*.r.fq)
            output_prefix: Output file prefix
            threads: Number of threads 
        """
        if not self.in_docker:
            self.logger.warning("PEAR can only be executed within Docker container")
            print("Warning: PEAR can only be executed within Docker container", flush=True)
            return None
        
        cmd = [
            'pear',
            '-f', str(forward_file),
            '-r', str(reverse_file),
            '-o', str(output_prefix),
            '-j', str(threads)
        ]
        
        self.run_command(cmd)
        
        # -- return expected output files
        return {
            'assembled': f"{output_prefix}.assembled.fastq",
            'unassembled_forward': f"{output_prefix}.unassembled.forward.fastq", 
            'unassembled_reverse': f"{output_prefix}.unassembled.reverse.fastq",
            'discarded': f"{output_prefix}.discarded.fastq"
        }

def run_pear_analysis():
    tools = PEARTools()
    
    print("=" * 40, flush=True)
    print("PEAR v0.9.6 [January 15, 2015]", flush=True)
    
    print(f"\nPEAR output directory: {tools.pear_output_dir}", flush=True)
    
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
            # -- PEAR
            output_prefix = f"{tools.pear_output_dir}/{species}"
            
            pear_results = tools.pear_join(
                forward_file=species_data['forward'],
                reverse_file=species_data['reverse'],
                output_prefix=output_prefix
            )
            
            if pear_results:
                print(f"{species} PEAR completed successfully", flush=True)
                
                # results
                for file_type, filename in pear_results.items():
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
                
                results[species] = pear_results
            
        except Exception as e:
            print(f"Processing failed for {species}: {e}", flush=True)
            continue
    
    print(f"PEAR processing completed", flush=True)
    
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
    
    # 檢查 pear 輸出目錄
    pear_dir = "/app/data/outputs/pear"
    if os.path.exists(pear_dir):
        print(f"\nPEAR output directory: {pear_dir}", flush=True)
        files = sorted(Path(pear_dir).glob("*"))
        if files:
            for file in files:
                size = file.stat().st_size if file.exists() else 0
                print(f"  {file.name} ({size} bytes)", flush=True)
        else:
            print("  (empty directory)", flush=True)
    else:
        print(f"PEAR output directory: {pear_dir} (will be created)", flush=True)

def main():
    list_available_files()
    print(flush=True)
    results = run_pear_analysis()

if __name__ == "__main__":
    main()