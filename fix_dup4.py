import io

path = "lib/actions/product.actions.ts"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove first occurrences of duplicate functions
# We want to keep the second occurrences

# Remove first bulkChangeStatus (starts at line 425, index 424)
# Find the end of this function
for i in range(424, 464):
    if 'export async function bulkChangeStatus(' in lines[i]:
        # Found first occurrence at i
        # Find end of function (count braces)
        brace_count = 0
        found_try = False
        end = i
        for j in range(i, len(lines)):
            if 'try' in lines[j] and '{' in lines[j]:
                found_try = True
            if '{' in lines[j]:
                brace_count += 1
            if '}' in lines[j]:
                brace_count -= 1
                if found_try and brace_count == 0:
                    end = j
                    break
        print(f"Removing first bulkChangeStatus from line {i+1} to {end+1}")
        del lines[i:end+1]
        break

# Remove first bulkDeleteAllPages (starts at line 466, index 465)
for i in range(465, 533):
    if 'export async function bulkDeleteAllPages(' in lines[i]:
        # Found first occurrence at i
        brace_count = 0
        found_try = False
        end = i
        for j in range(i, len(lines)):
            if 'try' in lines[j] and '{' in lines[j]:
                found_try = True
            if '{' in lines[j]:
                brace_count += 1
            if '}' in lines[j]:
                brace_count -= 1
                if found_try and brace_count == 0:
                    end = j
                    break
        print(f"Removing first bulkDeleteAllPages from line {i+1} to {end+1}")
        del lines[i:end+1]
        break

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed! New line count:", len(lines))
