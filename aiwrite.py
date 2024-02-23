import os 
  
from langchain.agents import Tool  
from langchain.agents import load_tools  
  
from crewai import Agent, Task, Process, Crew  
from langchain.llms import Ollama  
ollama_llm = Ollama(model="mixtral")  
  
# Enter your research topic  
research_topic= "Machine Learning and lung cancer decision making"  
  
from langchain.tools import DuckDuckGoSearchRun  
search_tool = DuckDuckGoSearchRun()  
 
researcher = Agent(  
role="Senior Researcher",  
goal="Find the latest topic about {research topic} on the internet.",  
backstory="""you are expert in researching about the latest news and information about various topics.  
""",  
verbose=True,  
allow_delegation=False,  
tools=[search_tool],  
llm=ollama_llm  
)  
  
writer = Agent(  
role=" Technical Writer",  
goal="Write engaging report about the information provided and use simple english",  
backstory="""You are expert in writing various domain articles. Your articles are engaging and interesting.""",  
verbose=True,  
allow_delegation=True,  
llm=ollama_llm  
)  
reviewer = Agent(  
role="Expert Writing Critic",  
goal="Review the and identfy potential issues in article draft. Make sure draft has neutral tone and simple english.",  
backstory="""You are expert reviewer with 10 years of exprience in reviewing documents.  
The make sure that article are interesting and correct information provided.  
""",  
verbose=True,  
allow_delegation=True,  
llm=ollama_llm  
)  
  
task_report = Task(  
description="""Conduct a thorough examination of the latest advancements in artificial intelligence (AI) in lung cancer decision making in 2024.  
Identify the key trends, breakthrough technologies, and potential industry impacts.  
Your final product should be a comprehensive analysis report.  
""",  
agent= researcher,  
)  
  
task_blog = Task(  
description="""Craft a blog post with a concise and impactful headline,  
showcasing at least 10 paragraphs that summarize the latest information  
found online. Engage your audience with a compelling, fun,  
and informative tone that effectively conveys the technical aspects of the topic in simple terms.  
Highlight specific new, exciting projects, apps, and companies revolutionizing the AI landscape.  
Employ a clear and concise writing style, avoiding numbered paragraphs, and bolding project and tool names.  
Ensure that all project, tool, and research paper links are included within the article.  
""",  
agent=writer,  
)  
  
task_critique = Task(  
description="""Sharpen the focus of the blog by identifying overly wordy sections and crafting concise alternatives.  
Ensuring a captivating headline of no more than 40 characters, the blog should encompass at least 3 paragraphs.  
Incorporate specific model, company, and project names, while also providing compelling reasons for readers to  
delve deeper into each entry. Maintain consistency in linking each paper, project, and company to their respective sources.  
""",  
agent= reviewer,  
)  
  
# instantiate crew of agents  
crew = Crew(  
agents=[researcher, writer, reviewer],  
tasks=[task_report, task_blog, task_critique],  
verbose=2,  
process=Process.sequential, # Sequential process will have tasks executed one after the other and the outcome of the previous one is passed as extra content into this next.  
)  
  
# Get your crew to work!  
result = crew.kickoff()  
  
print("######################")  
print(result)