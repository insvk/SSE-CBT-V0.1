#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_LINE_LENGTH 2048
#define MAX_FIELDS 10

// Simple CSV parser for Question Bulk Import
// Format: Type,Subject,Difficulty,QuestionText,Opt1,Opt2,Opt3,Opt4,CorrectOpt
// Note: This is a fast, specialized parser assuming no escaped commas in fields for v0.1

typedef struct {
    char type[32];
    char subject[64];
    char difficulty[32];
    char text[512];
    char options[4][128];
    char correct_opt[10];
} QuestionRow;

void trim_newline(char *str) {
    int len = strlen(str);
    if (len > 0 && str[len-1] == '\n') str[len-1] = '\0';
    if (len > 1 && str[len-2] == '\r') str[len-2] = '\0';
}

int parse_csv(const char *filename) {
    FILE *file = fopen(filename, "r");
    if (!file) {
        perror("Failed to open file");
        return 1;
    }

    char line[MAX_LINE_LENGTH];
    int line_count = 0;
    int success_count = 0;

    // Output JSON array start
    printf("[\n");

    while (fgets(line, sizeof(line), file)) {
        line_count++;
        if (line_count == 1) continue; // Skip header
        
        trim_newline(line);
        if (strlen(line) == 0) continue;

        QuestionRow row = {0};
        
        char *token = strtok(line, ",");
        int field = 0;
        
        while (token != NULL && field < 9) {
            switch(field) {
                case 0: strncpy(row.type, token, sizeof(row.type)-1); break;
                case 1: strncpy(row.subject, token, sizeof(row.subject)-1); break;
                case 2: strncpy(row.difficulty, token, sizeof(row.difficulty)-1); break;
                case 3: strncpy(row.text, token, sizeof(row.text)-1); break;
                case 4: strncpy(row.options[0], token, sizeof(row.options[0])-1); break;
                case 5: strncpy(row.options[1], token, sizeof(row.options[1])-1); break;
                case 6: strncpy(row.options[2], token, sizeof(row.options[2])-1); break;
                case 7: strncpy(row.options[3], token, sizeof(row.options[3])-1); break;
                case 8: strncpy(row.correct_opt, token, sizeof(row.correct_opt)-1); break;
            }
            token = strtok(NULL, ",");
            field++;
        }

        if (field >= 9) {
            if (success_count > 0) printf(",\n");
            printf("  {\n");
            printf("    \"type\": \"%s\",\n", row.type);
            printf("    \"subject\": \"%s\",\n", row.subject);
            printf("    \"difficulty\": \"%s\",\n", row.difficulty);
            printf("    \"text\": \"%s\",\n", row.text);
            printf("    \"options\": [\"%s\", \"%s\", \"%s\", \"%s\"],\n", row.options[0], row.options[1], row.options[2], row.options[3]);
            printf("    \"correct\": \"%s\"\n", row.correct_opt);
            printf("  }");
            success_count++;
        }
    }

    printf("\n]\n");
    fclose(file);
    fprintf(stderr, "Processed %d lines, successfully parsed %d questions.\n", line_count, success_count);
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <input.csv>\n", argv[0]);
        return 1;
    }
    
    return parse_csv(argv[1]);
}
