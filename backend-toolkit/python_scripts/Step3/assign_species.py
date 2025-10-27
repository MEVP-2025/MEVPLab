#!/usr/bin/env python3
"""
Modified species assignment script:
- No longer skip "sp." and china species 
- Priority order:
  1. "mitochondrion" + identity >= 98
  2. If no mitochondrion, choose first with identity >= 98
  3. If none above, choose first hit
"""
import sys
import os
from pathlib import Path

def species_assignment(keyword, identity_threshold):
    # -- Find the dloop.bln file in the blast output directory
    blast_dir = Path("/app/data/outputs/blast")
    
    if not blast_dir.exists():
        print(f"Error: Blast output directory does not exist: {blast_dir}", flush=True)
        sys.exit(1)
    
    dloop_files = list(blast_dir.glob("*.dloop.bln"))
    
    if len(dloop_files) == 0:
        print(f"Error: No .dloop.bln file found in {blast_dir}", flush=True)
        sys.exit(1)
    elif len(dloop_files) > 1:
        print(f"Warning: Multiple .dloop.bln files found, using the first one", flush=True)
    
    blnfile_name = dloop_files[0]
    print(f"Processing: {blnfile_name}", flush=True)

    has_keyword = keyword and keyword.strip()
    if has_keyword:
        print(f"Using keyword: '{keyword}', identity threshold: {identity_threshold}", flush=True)
    else:
        print(f"No keyword provided, using identity threshold: {identity_threshold}", flush=True)
    
    species_name = blnfile_name.name.split('.')[0] # -- select all names before the first "."
    
    output_dir = Path("/app/data/outputs/assign")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    outfile_path = output_dir / f"{species_name}.assign.species"
    outfile = open(outfile_path, "w")
    
    print(f"Output will be written to: {outfile_path}", flush=True)
    
    # -- read bln+species file
    dt = {}
    total_lines = 0
    
    with open(blnfile_name, 'r', encoding='utf-8') as file:
        for i, line in enumerate(file):
            total_lines += 1
            if total_lines % 1000 == 0:
                print(f"Reading line {total_lines}...", flush=True)
            
            line = line.rstrip()
            if not line:  # skip empty lines
                continue
                
            fields = line.split(',')
            read_id = fields[0]
            identity = float(fields[2])
            species = fields[1]

            try:
                ref_id, ref_rest = species.split('.1:')
                extracted_species_name = '_'.join(ref_rest.split('_')[1:3])
            except:
                extracted_species_name = '_'.join(species.split('_')[1:3])
            
            # -- No longer filter out sp. or china species, keep all hits
            if read_id in dt:
                dt[read_id].append([extracted_species_name, species, identity, line])
            else:
                dt[read_id] = [[extracted_species_name, species, identity, line]]
    
    print(f"Finished reading {total_lines} lines, found {len(dt)} unique reads", flush=True)
    
    assigned_count = 0
    for read_id in dt.keys():
        assigned_count += 1
        if assigned_count % 10000 == 0:
            print(f"Assigned {assigned_count} reads...", flush=True)
        
        # -- Priority 1: check keyword + identity >= threshold
        priority = 0 
        if has_keyword:
            for i, hit in enumerate(dt[read_id]):
                extracted_species_name, species, identity, line = hit
                full_species_info = species.split('_')
                if keyword in full_species_info and identity >= identity_threshold:
                    print_line = extracted_species_name + ',' + str(identity) + ',' + line
                    priority = 1
                    break
        
        # -- Priority 2: if no keyword match, choose first with identity >= threshold
        secondary = 0
        if not priority:
            for i, hit in enumerate(dt[read_id]):
                extracted_species_name, species, identity, line = hit
                if identity >= identity_threshold:
                    print_line = extracted_species_name + ',' + str(identity) + ',' + line
                    secondary = 1
                    break
        
        # -- Priority 3: if none above, choose the first one
        if not priority and not secondary: 
            extracted_species_name, species, identity, line = dt[read_id][0]
            print_line = extracted_species_name + ',' + str(identity) + ',' + line
        
        outfile.write(read_id + ',' + print_line + '\n')
    
    outfile.close()
    print(f"Species assignment completed! Assigned {assigned_count} reads to {outfile_path}", flush=True)

if __name__ == "__main__":
    keyword = sys.argv[1]
    identity_threshold = int(sys.argv[2])

    if not keyword or keyword.strip() == "":
        keyword = None

    species_assignment(keyword, identity_threshold)