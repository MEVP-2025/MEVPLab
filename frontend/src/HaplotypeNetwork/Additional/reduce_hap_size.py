#! /usr/bin/python

"""
use location vs. haplotype raw data 
to reduce hap size to N (for example, N ~ 30)
all haplotypes (using index)
"""

import sys

infile_name = sys.argv[1]	#Zpl.dup.list
# >uniq_17_4      f_287241_ZpDL_Dapo_R1f,f_458536_ZpDL_XkB_R1f,f_756313_ZpDL_Dapo_R1f,f_1304152_ZpDL_Dapo_R2f

seqfile_name = sys.argv[2]	#Zpl.dup.tab  //Zp-ASVs.msa.tab, aligned file
# uniq_17_4       atattatgtataatatcacataatgcattaataccatatatgtattatcaccattcatttattttaaccccaaagcaagtactaaaatt

reduce_size = int(sys.argv[3])	# 30?

# -- parse infile
dt = {}
haplotypes = []
for i, line in enumerate(file(infile_name)):
	line = line.rstrip()

	hap_info, all_read_IDs = line.split('\t')

	# -- hap_index
	hap_index = hap_info.split('_')[1]

	all_read_IDs = all_read_IDs.split(',')

	if hap_index not in haplotypes:
		haplotypes.extend([hap_index])

	for read_ID in all_read_IDs:
		location = read_ID.split('_')[3]
		k =  location + '_' + hap_index		# -- key

		if dt.has_key(k):
			dt[k] += 1
		else:
			dt[k] = 1

# -- parse seqfile
dt_seq = {}
for i, line in enumerate(file(seqfile_name)):
	line = line.rstrip()

	hap_info, seq = line.split('\t')
	
	# -- hap_index
	hap_index = hap_info.split('_')[1]

	dt_seq[hap_index] = seq


locations = ["BbR","Bie","CHR","Dapo","DsXlR","DzkR","GZK","GfSP","HL","HkR","HlLR","KKK1","KKK2","LKr","LLR","LRhp","Ljyb","NGS","NNWra","Nc","NjB","NpB","OPxOe","PLT","PLzxl","PzRLsB","QFb","QMg","QS2b","RF","SASR","SGWW","SYR165","Skbl","SktR","StR","WXR","XkB","XwR","YTR","ZJb","Zp3-A","small","spd1","spd2"]

# -- per site
# -- calculate total numbers per site
total_in_loc = []
reduce_dt = {}
for loc_index, i in enumerate(locations):

	# -- sum
	total_in_loc.append(0)

	for j in haplotypes:
		k = i + '_' + j				# -- key: location - hap_index
		if dt.has_key(k):
			total_in_loc[loc_index] += dt[k]	# -- total_in_loc

	# -- reduce_size = N
	arry_hap_num = []
	arry_hap_index = []
	for j in haplotypes:
		k = i + '_' + j
		if dt.has_key(k):
			# -- assume the location has reduce_size sequences
			reduce_hap_num = int(dt[k] * 1.0 / total_in_loc[loc_index] * reduce_size)
			reduce_dt[k] = reduce_hap_num
			arry_hap_num.append(reduce_hap_num)
			arry_hap_index.append(j)

	# -- debug
	#print i
	#for j in haplotypes:
	#	k = i + '_' + j
	#	if dt.has_key(k):
	#		print dt[k],
	#print arry_hap_num
	#print arry_hap_index

	# -- add from the largest haplotype, until pass reduce_size
	final_reduce_size = 0
	keep_hap_num = []
	keep_hap_index = []
	while (arry_hap_num and final_reduce_size < reduce_size):
		# -- find maximum
		max_hap_num = max(arry_hap_num)
		max_arry_index = arry_hap_num.index(max_hap_num)
		max_hap_index = arry_hap_index[max_arry_index]

		# -- add into whole population
		final_reduce_size += max_hap_num
		keep_hap_num.append(max_hap_num)
		keep_hap_index.append(max_hap_index)
	
		# -- remove from the array
		del arry_hap_num[max_arry_index]	
		del arry_hap_index[max_arry_index]

	#print keep_hap_num
	#print keep_hap_index

	# -- need to generate seq/msa file
	for j in keep_hap_index:
		k = i + '_' + j
		
		for z in range(reduce_dt[k]):
			reduce_read_id = '>' + i + '_' + j + '_' + str(z)
			print reduce_read_id + '\n' + dt_seq[j]


