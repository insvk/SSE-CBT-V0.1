CC=gcc
CFLAGS=-Wall -Wextra -O3 -std=c11

all: bulk_parser

bulk_parser: bulk_parser.c
	$(CC) $(CFLAGS) -o bulk_parser bulk_parser.c

clean:
	rm -f bulk_parser bulk_parser.exe
