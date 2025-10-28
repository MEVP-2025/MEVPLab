#!/usr/bin/env python3

import sys
import os
from pathlib import Path

def asv_generator(t_file, prefix, copy_num):
    asvfile_seq_name = prefix + ".asv.fa"
    asvfile_seq = open(asvfile_seq_name, 'w')

    uniqfile_seq_name = prefix + ".uniq.fa"
    uniqfile_seq = open(uniqfile_seq_name, 'w')

    outfile_list_name = prefix + ".dup.list"
    outfile_list = open(outfile_list_name, 'w')


    dt = {}
    #uniq_counts = 0
    with open(t_file, 'r') as f:
        for i, line in enumerate(f):
            line = line.rstrip()
            read_id, read_seq = line.split('\t')

            if read_seq in dt:
                dt[read_seq][0] += 1
                dt[read_seq].extend([read_id])
            else:
                dt[read_seq] = [1, read_id]
                # uniq_counts += 1

    #print("total uniq reads: ", uniq_counts)

    read_index = 0
    for k in dt.keys():
        fa_line = '>hap_' + str(read_index) + '_' + str(dt[k][0])
        seq_line = k
        read_id_list = dt[k][1:]	# -- reads name ( >f_616_ZpDL_XwR_R2f )

        read_index += 1

        if dt[k][0] > copy_num:
            for read_id in read_id_list:
                asv_line = '>' + read_id + ',' + fa_line[1:]
                asvfile_seq.write(asv_line + '\n')
                asvfile_seq.write(seq_line + '\n')

            outfile_list.write(fa_line + '\t' + ','.join(read_id_list) + '\n')
        else:
            for read_id in read_id_list:
                uniq_line = '>' + read_id + ',' + fa_line[1:]
                uniqfile_seq.write(uniq_line + '\n')
                uniqfile_seq.write(seq_line + '\n')

        # -- add asv.fa


    # outfile_seq.close()
    asvfile_seq.close()
    uniqfile_seq.close()
    outfile_list.close()

if __name__ == "__main__":
    input_dir = "/app/data/outputs/trimmed"
    output_dir = "/app/data/outputs/separated"

    copy_num = int(sys.argv[1])

    os.makedirs(output_dir, exist_ok=True)

    trimmed_files = list(Path(input_dir).glob('*.msa.tab.trimmed.fa'))
    
    for t_file in trimmed_files:
        prefix = Path(t_file).name.split(".")[0]

        sample_dir = os.path.join(output_dir, prefix)
        os.makedirs(sample_dir, exist_ok=True)

        full_prefix = os.path.join(sample_dir, prefix)

        print(f"Processing {t_file}...", flush=True)
        asv_generator(str(t_file), full_prefix, copy_num)
        print(f"Completed {prefix}", flush=True)