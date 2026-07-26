import asyncio
import random
import string
import time

import aiohttp

URL = "http://localhost:3000/api/v1/answer-sheet/upload"

TOTAL_REQUESTS = 10000
CONCURRENT_REQUESTS = 500

OPTIONS = ["A", "B", "C", "D"]
BOOKLET_VERSIONS = ["A1", "A2", "B1", "B2", "C1", "C2"]


def random_name(length=10):
    return "".join(random.choices(string.ascii_uppercase, k=length))


def generate_answers():
    responses = []

    for i in range(1, 51):
        user_answer = random.choice(OPTIONS)

        responses.append({
            "question_number": i,
            "user_answer": user_answer
        })

    return responses


def generate_payload(index):
    return {
        "candidate_name": random_name(),
        "registration_number": 100000000 + index,
        "paper": random.randint(1, 4),
        "booklet_version": random.choice(BOOKLET_VERSIONS),
        "booklet_serial_no": str(random.randint(100000, 999999)),
        "answer_responses": generate_answers()
    }


async def upload(session, semaphore, index):
    payload = generate_payload(index)

    async with semaphore:
        try:
            async with session.post(URL, json=payload) as response:
                await response.read()

                return response.status == 200

        except Exception:
            return False


async def main():

    print("=" * 80)
    print("OMR LOAD TEST")
    print("=" * 80)

    print(f"URL                 : {URL}")
    print(f"Total Requests      : {TOTAL_REQUESTS}")
    print(f"Concurrent Requests : {CONCURRENT_REQUESTS}")
    print("=" * 80)

    connector = aiohttp.TCPConnector(limit=0)

    timeout = aiohttp.ClientTimeout(total=60)

    semaphore = asyncio.Semaphore(CONCURRENT_REQUESTS)

    start = time.perf_counter()

    async with aiohttp.ClientSession(
        connector=connector,
        timeout=timeout
    ) as session:

        tasks = []

        for i in range(TOTAL_REQUESTS):

            print(f"Creating Task {i}")

            tasks.append(
                upload(session, semaphore, i)
            )

        print()
        print(f"Created {len(tasks)} Tasks")
        print("Starting Requests...")
        print()

        completed = 0
        success = 0
        failed = 0

        for task in asyncio.as_completed(tasks):

            result = await task

            completed += 1

            if result:
                success += 1
            else:
                failed += 1

            print(
                f"Completed : {completed}/{TOTAL_REQUESTS} | "
                f"Success : {success} | "
                f"Failed : {failed}"
            )

    elapsed = time.perf_counter() - start

    print()
    print("=" * 80)
    print("FINAL REPORT")
    print("=" * 80)

    print(f"Total Requests      : {TOTAL_REQUESTS}")
    print(f"Concurrent          : {CONCURRENT_REQUESTS}")
    print(f"Success             : {success}")
    print(f"Failed              : {failed}")
    print(f"Elapsed Time        : {elapsed:.2f} sec")
    print(f"Requests / Second   : {TOTAL_REQUESTS / elapsed:.2f}")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())