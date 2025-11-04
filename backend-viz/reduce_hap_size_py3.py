#! /usr/bin/python

import sys
import pandas as pd
import textwrap
import os

# ---------- 新增：自動把 .msa.asv.fa 拆成 .fa 和 .list ----------
def split_fasta_to_list_and_fa(original_fa, target_outputs_dir):
    os.makedirs(target_outputs_dir, exist_ok=True)

    # 固定名稱
    fa_file = os.path.join(target_outputs_dir, "asv.fa")
    list_file = os.path.join(target_outputs_dir, "asv.list")

    seq_dict = {}   # uniq_ID -> sequence
    id_mapping = {} # uniq_ID -> list of original IDs

    with open(original_fa, "r") as f:
        current_seq = []
        current_uniq = None
        current_ids = []

        for line in f:
            line = line.strip()
            if line.startswith(">"):
                if current_uniq:
                    if current_uniq in id_mapping:
                        id_mapping[current_uniq].extend(current_ids)
                    else:
                        seq_dict[current_uniq] = ''.join(current_seq)
                        id_mapping[current_uniq] = current_ids

                header = line[1:]
                if "," in header:
                    original_id, uniq_id = header.split(",")
                else:
                    original_id, uniq_id = header, header

                current_uniq = uniq_id
                current_seq = []
                current_ids = [original_id]
            else:
                current_seq.append(line)

        # 最後一個序列
        if current_uniq:
            if current_uniq in id_mapping:
                id_mapping[current_uniq].extend(current_ids)
            else:
                seq_dict[current_uniq] = ''.join(current_seq)
                id_mapping[current_uniq] = current_ids

    # 寫入 .fa，斷行 60 字
    with open(fa_file, "w") as f_out:
        for uniq_id, seq in seq_dict.items():
            f_out.write(f">{uniq_id}\n")
            f_out.write('\n'.join(textwrap.wrap(seq, 60)) + '\n')

    # 寫入 .list
    with open(list_file, "w") as f_out:
        for uniq_id, ids in id_mapping.items():
            f_out.write(f">{uniq_id}\t{','.join(ids)}\n")

    print(f"Generated FA: {fa_file}")
    print(f"Generated LIST: {list_file}")
    return list_file, fa_file


# ---------- 主程式 ----------
if len(sys.argv) != 5:
    print("Usage: python reduce_hap_size_py3.py <original_fasta.msa.asv.fa> <reduce_size> <excel_file> <output_fasta>")
    sys.exit(1)

original_fa = sys.argv[1]        # Zpl.dup.msa.asv.fa
reduce_size = int(sys.argv[2])   # 例如 30
excel_file = sys.argv[3]         # eDNA.xlsx
output_file = sys.argv[4]        # Zpl.reduce.fa

target_outputs_dir = os.path.dirname(output_file)
os.makedirs(target_outputs_dir, exist_ok=True)

# Step 1: 自動拆成 .list 和 .fa
list_file, fasta_file = split_fasta_to_list_and_fa(original_fa, target_outputs_dir)
print(f"Created {list_file} and {fasta_file} from {original_fa}")

# Step 2: 從 Excel 取得唯一樣站
df = pd.read_excel(excel_file)
df.columns = df.columns.str.strip()
if 'eDNA_ID' not in df.columns:
    print("找不到 'eDNA_ID' 欄位，請確認 Excel 檔案格式")
    sys.exit(1)

locations = sorted(df['eDNA_ID'].dropna().astype(str).str.strip().unique().tolist())
print(f"Found {len(locations)} unique locations: {locations}")

# Step 3: 讀取 .list
haplotypes = []
hap_location_counts = {}
with open(list_file, 'r') as infile:
    for line in infile:
        line = line.strip()
        if not line or '\t' not in line:
            continue
        hap_id, read_ids = line.split('\t')
        hap_index = hap_id.split('_')[1]
        if hap_index not in haplotypes:
            haplotypes.append(hap_index)
        for read_id in read_ids.split(','):
            parts = read_id.split('_')
            if len(parts) >= 4:
                location = parts[3]
                key = f"{location}_{hap_index}"
                hap_location_counts[key] = hap_location_counts.get(key, 0) + 1
print(f"Loaded {len(haplotypes)} haplotypes")

# Step 4: 讀取 .fa
hap_seqs = {}
with open(fasta_file, 'r') as f:  # <- 改成讀 outputs/ 下的 fa_file
    current_id = None
    seq_lines = []
    for line in f:
        line = line.strip()
        if line.startswith(">"):
            if current_id:
                hap_index = current_id.split('_')[1]
                hap_seqs[hap_index] = ''.join(seq_lines)
            current_id = line[1:]
            seq_lines = []
        else:
            seq_lines.append(line)
    if current_id:
        hap_index = current_id.split('_')[1]
        hap_seqs[hap_index] = ''.join(seq_lines)
print(f"Loaded {len(hap_seqs)} FASTA sequences")

# Step 5: 減少 haplotype
output_entries = []
for loc in locations:
    total = 0
    reduce_dt = {}
    arry_hap_num = []
    arry_hap_index = []

    for hap_index in haplotypes:
        key = f"{loc}_{hap_index}"
        count = hap_location_counts.get(key, 0)
        total += count

    for hap_index in haplotypes:
        key = f"{loc}_{hap_index}"
        count = hap_location_counts.get(key, 0)
        if count > 0 and total > 0:
            reduce_count = int((float(count) / total) * reduce_size)
            if reduce_count > 0:
                reduce_dt[key] = reduce_count
                arry_hap_num.append(reduce_count)
                arry_hap_index.append(hap_index)

    keep_hap_index = []
    final_reduce_size = 0

    while arry_hap_num and final_reduce_size < reduce_size:
        max_val = max(arry_hap_num)
        idx = arry_hap_num.index(max_val)
        hap_index = arry_hap_index[idx]

        final_reduce_size += max_val
        keep_hap_index.append(hap_index)

        del arry_hap_num[idx]
        del arry_hap_index[idx]

    for hap_index in keep_hap_index:
        key = f"{loc}_{hap_index}"
        num = reduce_dt.get(key, 0)
        if hap_index in hap_seqs:
            for i in range(num):
                output_entries.append((loc, int(hap_index), i, hap_seqs[hap_index]))

output_entries.sort()

with open(output_file, 'w') as out:
    for loc, hap_index, i, seq in output_entries:
        out.write(f">{loc}_{hap_index}_{i}\n{seq}\n")

print(f"Done! Output {len(output_entries)} representative haplotypes to {output_file}")
