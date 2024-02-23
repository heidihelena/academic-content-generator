#lung cancer MDT guideline2
from crewai import Agent, Task, Process, Crew
from langchain_community.llms import Ollama
from Bio import Entrez
from langchain_community.tools import DuckDuckGoSearchRun

# To Load Local models through Ollama
llm_mixtral = Ollama(model="mixtral")

po = Agent(
    role="Product Owner",
    goal="Ensure the detailed drafting of lung cancer multidiciplinary team guideline",
    backstory="""As the Product Owner of an Agile consult team, you excel at comprehending, identifying the target audience,
        and analyzing the competition. This expertise is essential for validating if a concept addresses a market need and possesses
        the potential to captivate a broad audience. You are skilled at devising strategies to appeal to the widest possible audience,
        ensuring the product aligns with user stories and meets market expectations.
		""",
    verbose=True,
    allow_delegation=False,
    llm=llm_mixtral


)

developer = Agent(
role="Lung Cancer Guideline Expert",
goal="Implement the requirements outlined in each guideline through literature review",
backstory="""You are a master of literature review, with a profound knowledge of evidence. Your expertise is in writing lung cancer
        guidelines and also understanding how these guidelines can streamline operations, automate mundane tasks, and solve complex clinical
        challenges. With a keen eye for detail and a deep understanding of system architecture, you adeptly craft guidelines that enhance 
        productivity and ensure performance of lung cancer pathway. Your ability to decipher and optimize existing guidelines, as well as to innovate
        new solutions, makes you an invaluable asset. Your insights and contributions are key in optimizing workflows, improving operational
        reliability, and driving technological efficiency.""",
    verbose=True,
    allow_delegation=False,
    llm=llm_mixtral
)

reviewver = Agent(
role="Reviewer",
goal="Review the evidence to assess the quality, maintainability, and alignment with the team's standards and best practices",
backstory="""You are a guardian of guideline quality, with a keen understanding of Agile development practices and a sharp eye for detail in evidence GRADE review. 
        Your expertise goes beyond mere evidence inspection; you are adept at ensuring that developments not only function as intended but also adhere 
        to the team's ethical standards, enhance maintainability, and seamlessly integrate with existing systems. With a deep appreciation for 
        collaborative development, you provide constructive feedback, guiding contributors towards best practices and fostering a culture of 
        continuous improvement. Your meticulous approach to reviewing guidelines, coupled with your ability to foresee potential issues and recommend 
        proactive solutions, ensures the delivery of high-quality text that is robust, scalable, and aligned with the team's strategic goals.""",
    verbose=True,
    allow_delegation=True,
    llm=llm_mixtral
)

task1 = Task(
    description="""Develop MDT guidelines:
        - Search literature,
        - Grade evidence (A,B,C,D),
        - Write guideline,
        This lung cancer MDT guideline tool aims to streamline and automate processes, enhancing operational efficiency and reliability. Your evidence GRADE should
        clearly articulate the needs and expectations of the users, focusing on how they will interact with the tool to perform MDT tasks
        more effectively. Include scenarios covering a range of lung cancer cases, from early stage lung cancer to complex stage III diagnostic pathway involving
        multimodality treatment. Ensure that each guideline is detailed, specifying the context, the user's goal, and the
        desired outcome, to guide the development team in creating a solution that meets users' needs.
    """,
    agent=po,
)

task2 = Task(
    description="""Implement the guidelines developed by your Product Owner. Your implementation should thoroughly 
    address each user story's requirements, providing a seamless experience for the end-users, focusing on creating a robust and efficient tool. 
    The task involves coding the various operational scenarios described in the provided guidelines. You will follow 'best practise,
    GRADE evidence' principal. You ensure your guideline is clean, well-documented, and adheres to best practices for guideline development.
    The final product should be a text formatted in markdown.
    """,
    agent=developer,
)

task3 = Task(
    description="""Ensure the delivery is a guideline. Ensure the quality of the guideline. Provide detailed feedback to guideline developers, highlighting areas for improvement, potential gaps in literature, and suggestions for research. Your review should include a checklist of criteria for MDT. Ensure that the guideline is not only functional but also maintainable and scalable and references and grade is included.
    Collaborate with the development team to achieve high-quality guideline delivery in the project.
    """,
    agent=reviewver,
)

crew = Crew(
    agents=[po, developer, reviewver],
    tasks=[task1, task2, task3],
    verbose=2,
    process=Process.sequential,
)

result = crew.kickoff()

print("######################")
print()