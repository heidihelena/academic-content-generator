from textwrap import dedent
import os 
from langchain.agents import Tool  
from langchain.agents import load_tools  
  
from crewai import Agent, Task, Process, Crew  
from langchain.llms import Ollama  
ollama_llm = Ollama(model="mixtral")  
  

class GameTasks():

    def __init__(self, game):

        self.game = game

  

    def code_task(self, agent, received_code=import requests

class ZoteroTool:
    def __init__(self, api_key: str, user_id: str):
        self.api_key = api_key
        self.user_id = user_id
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def fetch_zotero_references(self, tag: str) -> list:
        url = f"https://api.zotero.org/users/{self.user_id}/items?tag={tag}&format=json&limit=10"
        response = requests.get(url, headers=self.headers)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch data: {response.text}")

        items = response.json()
        references = [(item.get("data", {}).get("title", "No title available"), 
                       item.get("key", "No ID available")) for item in items]
        return references

    def add_reference_to_zotero_collection(self, collection_id: str, reference_data: dict) -> dict:
        url = f"https://api.zotero.org/users/{self.user_id}/collections/{collection_id}/items"
        response = requests.post(url, headers=self.headers, json=reference_data)
        if response.status_code not in [200, 201]:
            raise Exception(f"Failed to add reference: {response.status_code} {response.text}")

        return response.json()

    def add_note_to_zotero_item(self, item_id: str, note_content: str) -> dict:
        url = f"https://api.zotero.org/users/{self.user_id}/items/{item_id}/children"
        note_data = {
            "itemType": "note",
            "note": note_content
        }
        response = requests.post(url, headers=self.headers, json=note_data)
        if response.status_code != 201:
            raise Exception(f"Failed to add note: {response.status_code} {response.text}")

        return response.json()):

        if received_code:

            description = dedent(f"""You are {agent}, your task is to 

improve the following python code based on the given instructions:

                        Instructions

                        ------------

                {self.game}

                        Your Final answer must be the full improved python

code, only the python code and nothing 

else.""").format(received_code=received_code)

        else:

            description = dedent(f"""You are {agent}, your task is to 

create a Zotero/PubMed tool using python based on the following 

instructions:

                        Instructions

                        ------------

                {self.game}

                        Your Final answer must be the full python code, 

only the python code and nothing else.""").format(game=self.game)

        return Task(description=description, agent=agent)

  

    def review_task(self, agent, received_code):

        return Task(description=dedent(f"""You are {agent}, your task is 

to review the code provided by another team member.

                        Instructions

                        ------------

                        Using the code you got from 

{received_code['agent']}, check for errors and provide feedback. Check for

logic errors, syntax errors, missing imports, variable declarations, 

mismatched brackets, security vulnerabilities, readability of the code and

if it meets the requirements of a Zotero/PubMed tool

                        Your Final answer must be a review in form of text

containing your comments, suggestions, and corrections."""))

  

    def evaluate_task(self, agent, received_code, received_review):

        return Task(description=dedent(f"""You are {agent}, your task is 

to evaluate the code and the review provided by other team members.

                        Instructions

                        ------------

                        {self.game}

                        You will look over the code to insure that it is 

complete, secure, readable, meets the requirements of a Zotero/PubMed tool

and takes into account the feedback provided by the reviewer.

                        Your Final answer must be a text containing your 

evaluation, comments, suggestions, and corrections."""))

# Get your crew to work!  
result = crew.kickoff()  
  
print("######################")  
print(result)