#!/usr/bin/env python3

"""
to trim 5' and 3' continuous gaps
two steps:
1. count number of gaps
2. actually trim them
"""

import sys
import os
from pathlib import Path


def trim_alignment_gaps(infile_name, output_dir):
    """
    Trim 5' and 3' continuous gaps from multiple sequence alignment
    
    Args:
        infile_name: Input file path (tab-separated format: ID\tsequence)
        output_dir: Output directory path
    """
    
    print(f"Processing: {Path(infile_name).name}", flush=True)
    
    # Create output filename
    input_name = Path(infile_name).name
    print(f"Output directory: ", output_dir, flush=True)
    output_file = os.path.join(output_dir, f"{input_name}.trimmed.fa")
    
    # -- 1. counts, maximum
    max5 = 0
    max3 = 0
    
    with open(infile_name, 'r') as f:
        for i, line in enumerate(f):
            line = line.rstrip()
            
            if not line or '\t' not in line:
                continue
                
            read_id, read_seq = line.split('\t')

            # -- 5'
            end5 = 0
            for j, nuc in enumerate(read_seq):
                if nuc == "-":
                    end5 += 1
                else:
                    break

            if end5 > max5: 
                max5 = end5

            # -- 3'
            end3 = 0
            for j in range(1, len(read_seq)+1):
                nuc = read_seq[-j]
                if nuc == "-":
                    end3 += 1
                else:
                    break

            if end3 > max3: 
                max3 = end3

    print(f"  Max 5' gaps: {max5}, Max 3' gaps: {max3}", flush=True)

    # -- 2. actually trim and write to output file
    with open(infile_name, 'r') as f, open(output_file, 'w') as out:
        for i, line in enumerate(f):
            line = line.rstrip()

            if not line or '\t' not in line:
                continue

            read_id, read_seq = line.split('\t')

            len3 = len(read_seq) - max3
            read_seq = read_seq[max5:len3]

            # out.write('>' + read_id + '\n' + read_seq + '\n')
            out.write(read_id + '\t' + read_seq + '\n')
    
    print(f"  Output saved to: {output_file}", flush=True)


if __name__ == "__main__":
    input_dir = "/app/data/outputs/tab_formatter"
    output_dir = "/app/data/outputs/trimmed"
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(input_dir):
        print(f"Input directory not found: {input_dir}", flush=True)
        sys.exit(1)
    
    # Process all files in directory
    all_files = [f for f in Path(input_dir).iterdir() if f.is_file()]
    
    if not all_files:
        print(f"No files found in {input_dir}", flush=True)
        sys.exit(1)
    
    print(f"Found {len(all_files)} files to process in {input_dir}", flush=True)
    print(f"Output will be saved to: {output_dir}", flush=True)
    
    for file_path in sorted(all_files):
        trim_alignment_gaps(str(file_path), output_dir)
    
    print(f"\nAll files processed! Check output in: {output_dir}", flush=True)