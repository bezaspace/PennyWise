Directory structure:
└── sessions/
    ├── express-mode.md
    ├── index.md
    ├── memory.md
    ├── session.md
    └── state.md

================================================
FILE: docs/sessions/express-mode.md
================================================
# Vertex AI Express Mode: Using Vertex AI Sessions and Memory for Free

If you are interested in using either the `VertexAiSessionService` or `VertexAiMemoryBankService` but you don't have a Google Cloud Project, you can sign up for Vertex AI Express Mode and get access
for free and try out these services! You can sign up with an eligible ***gmail*** account [here](https://console.cloud.google.com/expressmode). For more details about Vertex AI Express mode, see the [overview page](https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview). 
Once you sign up, get an [API key](https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview#api-keys) and you can get started using your local ADK agent with Vertex AI Session and Memory services!

!!! info Vertex AI Express mode limitations

    Vertex AI Express Mode has certain limitations in the free tier. Free Express mode projects are only valid for 90 days and only select services are available to be used with limited quota. For example, the number of Agent Engines is restricted to 10 and deployment to Agent Engine is reserved for the paid tier only. To remove the quota restrictions and use all of Vertex AI's services, add a billing account to your Express Mode project.

## Create an Agent Engine

`Session` objects are children of an `AgentEngine`. When using Vertex AI Express Mode, we can create an empty `AgentEngine` parent to manage all of our `Session` and `Memory` objects.
First, ensure that your enviornment variables are set correctly. For example, in Python:

      ```env title="weather_agent/.env"
      GOOGLE_GENAI_USE_VERTEXAI=TRUE
      GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_EXPRESS_MODE_API_KEY_HERE
      ```

Next, we can create our Agent Engine instance. You can use the Gen AI SDK.

=== "GenAI SDK"
    1. Import Gen AI SDK.

        ```
        from google import genai
        ```

    2. Set Vertex AI to be True, then use a POST request to create the Agent Engine
        
        ```
        # Create Agent Engine with GenAI SDK
        client = genai.Client(vertexai = True)._api_client

        response = client.request(
                http_method='POST',
                path=f'reasoningEngines',
                request_dict={"displayName": "YOUR_AGENT_ENGINE_DISPLAY_NAME", "description": "YOUR_AGENT_ENGINE_DESCRIPTION"},
            )
        response
        ```

    3. Replace `YOUR_AGENT_ENGINE_DISPLAY_NAME` and `YOUR_AGENT_ENGINE_DESCRIPTION` with your use case.
    4. Get the Agent Engine name and ID from the response

        ```
        APP_NAME="/".join(response['name'].split("/")[:6])
        APP_ID=APP_NAME.split('/')[-1]
        ```

## Managing Sessions with a `VertexAiSessionService`

[VertexAiSessionService](session.md###sessionservice-implementations) is compatible with Vertex AI Express mode API Keys. We can 
instead initialize the session object without any project or location.

       ```py
       # Requires: pip install google-adk[vertexai]
       # Plus environment variable setup:
       # GOOGLE_GENAI_USE_VERTEXAI=TRUE
       # GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_EXPRESS_MODE_API_KEY_HERE
       from google.adk.sessions import VertexAiSessionService

       # The app_name used with this service should be the Reasoning Engine ID or name
       APP_ID = "your-reasoning-engine-id"

       # Project and location are not required when initializing with Vertex Express Mode
       session_service = VertexAiSessionService(agent_engine_id=APP_ID)
       # Use REASONING_ENGINE_APP_ID when calling service methods, e.g.:
       # session = await session_service.create_session(app_name=REASONING_ENGINE_APP_ID, user_id= ...)
       ```
!!! info Session Service Quotas

    For Free Express Mode Projects, `VertexAiSessionService` has the following quota:

    - 100 Session Entities
    - 10,000 Event Entities

## Managing Memories with a `VertexAiMemoryBankService`

[VertexAiMemoryBankService](memory.md###memoryservice-implementations) is compatible with Vertex AI Express mode API Keys. We can 
instead initialize the memory object without any project or location.

       ```py
       # Requires: pip install google-adk[vertexai]
       # Plus environment variable setup:
       # GOOGLE_GENAI_USE_VERTEXAI=TRUE
       # GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_EXPRESS_MODE_API_KEY_HERE
       from google.adk.sessions import VertexAiMemoryBankService

       # The app_name used with this service should be the Reasoning Engine ID or name
       APP_ID = "your-reasoning-engine-id"

       # Project and location are not required when initializing with Vertex Express Mode
       memory_service = VertexAiMemoryBankService(agent_engine_id=APP_ID)
       # Generate a memory from that session so the Agent can remember relevant details about the user
       # memory = await memory_service.add_session_to_memory(session)
       ```
!!! info Memory Service Quotas

    For Free Express Mode Projects, `VertexAiMemoryBankService` has the following quota:

    - 200 Memory Entities

## Code Sample: Weather Agent with Session and Memory using Vertex AI Express Mode

In this sample, we create a weather agent that utilizes both `VertexAiSessionService` and `VertexAiMemoryBankService` for context maangement, allowing our agent to recall user prefereneces and conversations!

**[Weather Agent with Session and Memory using Vertex AI Express Mode](https://github.com/google/adk-docs/blob/main/examples/python/notebooks/express-mode-weather-agent.ipynb)**



================================================
FILE: docs/sessions/index.md
================================================
# Introduction to Conversational Context: Session, State, and Memory

## Why Context Matters

Meaningful, multi-turn conversations require agents to understand context. Just
like humans, they need to recall the conversation history: what's been said and
done to maintain continuity and avoid repetition. The Agent Development Kit
(ADK) provides structured ways to manage this context through `Session`,
`State`, and `Memory`.

## Core Concepts

Think of different instances of your conversations with the agent as distinct
**conversation threads**, potentially drawing upon **long-term knowledge**.

1.  **`Session`**: The Current Conversation Thread

    *   Represents a *single, ongoing interaction* between a user and your agent
        system.
    *   Contains the chronological sequence of messages and actions taken by the
        agent (referred to `Events`) during *that specific interaction*.
    *   A `Session` can also hold temporary data (`State`) relevant only *during
        this conversation*.

2.  **`State` (`session.state`)**: Data Within the Current Conversation

    *   Data stored within a specific `Session`.
    *   Used to manage information relevant *only* to the *current, active*
        conversation thread (e.g., items in a shopping cart *during this chat*,
        user preferences mentioned *in this session*).

3.  **`Memory`**: Searchable, Cross-Session Information

    *   Represents a store of information that might span *multiple past
        sessions* or include external data sources.
    *   It acts as a knowledge base the agent can *search* to recall information
        or context beyond the immediate conversation.

## Managing Context: Services

ADK provides services to manage these concepts:

1.  **`SessionService`**: Manages the different conversation threads (`Session`
    objects)

    *   Handles the lifecycle: creating, retrieving, updating (appending
        `Events`, modifying `State`), and deleting individual `Session`s.

2.  **`MemoryService`**: Manages the Long-Term Knowledge Store (`Memory`)

    *   Handles ingesting information (often from completed `Session`s) into the
        long-term store.
    *   Provides methods to search this stored knowledge based on queries.

**Implementations**: ADK offers different implementations for both
`SessionService` and `MemoryService`, allowing you to choose the storage backend
that best fits your application's needs. Notably, **in-memory implementations**
are provided for both services; these are designed specifically for **local
testing and fast development**. It's important to remember that **all data
stored using these in-memory options (sessions, state, or long-term knowledge)
is lost when your application restarts**. For persistence and scalability beyond
local testing, ADK also offers cloud-based and database service options.

**In Summary:**

*   **`Session` & `State`**: Focus on the **current interaction** – the history
    and data of the *single, active conversation*. Managed primarily by a
    `SessionService`.
*   **Memory**: Focuses on the **past and external information** – a *searchable
    archive* potentially spanning across conversations. Managed by a
    `MemoryService`.

## What's Next?

In the following sections, we'll dive deeper into each of these components:

*   **`Session`**: Understanding its structure and `Events`.
*   **`State`**: How to effectively read, write, and manage session-specific
    data.
*   **`SessionService`**: Choosing the right storage backend for your sessions.
*   **`MemoryService`**: Exploring options for storing and retrieving broader
    context.

Understanding these concepts is fundamental to building agents that can engage
in complex, stateful, and context-aware conversations.



================================================
FILE: docs/sessions/memory.md
================================================
# Memory: Long-Term Knowledge with `MemoryService`

![python_only](https://img.shields.io/badge/Currently_supported_in-Python-blue){ title="This feature is currently available for Python. Java support is planned/ coming soon."}

We've seen how `Session` tracks the history (`events`) and temporary data (`state`) for a *single, ongoing conversation*. But what if an agent needs to recall information from *past* conversations or access external knowledge bases? This is where the concept of **Long-Term Knowledge** and the **`MemoryService`** come into play.

Think of it this way:

* **`Session` / `State`:** Like your short-term memory during one specific chat.  
* **Long-Term Knowledge (`MemoryService`)**: Like a searchable archive or knowledge library the agent can consult, potentially containing information from many past chats or other sources.

## The `MemoryService` Role

The `BaseMemoryService` defines the interface for managing this searchable, long-term knowledge store. Its primary responsibilities are:

1. **Ingesting Information (`add_session_to_memory`):** Taking the contents of a (usually completed) `Session` and adding relevant information to the long-term knowledge store.  
2. **Searching Information (`search_memory`):** Allowing an agent (typically via a `Tool`) to query the knowledge store and retrieve relevant snippets or context based on a search query.

## Choosing the Right Memory Service

The ADK offers two distinct `MemoryService` implementations, each tailored to different use cases. Use the table below to decide which is the best fit for your agent.

| **Feature** | **InMemoryMemoryService** | **[NEW!] VertexAiMemoryBankService** |
| :--- | :--- | :--- |
| **Persistence** | None (data is lost on restart) | Yes (Managed by Vertex AI) |
| **Primary Use Case** | Prototyping, local development, and simple testing. | Building meaningful, evolving memories from user conversations. |
| **Memory Extraction** | Stores full conversation | Extracts [meaningful information](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/generate-memories) from conversations and consolidates it with existing memories (powered by LLM) |
| **Search Capability** | Basic keyword matching. | Advanced semantic search. |
| **Setup Complexity** | None. It's the default. | Low. Requires an [Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/overview) in Vertex AI. |
| **Dependencies** | None. | Google Cloud Project, Vertex AI API |
| **When to use it** | When you want to search across multiple sessions’ chat histories for prototyping. | When you want your agent to remember and learn from past interactions. |

## In-Memory Memory

The `InMemoryMemoryService` stores session information in the application's memory and performs basic keyword matching for searches. It requires no setup and is best for prototyping and simple testing scenarios where persistence isn't required.

```py
from google.adk.memory import InMemoryMemoryService
memory_service = InMemoryMemoryService()
```

**Example: Adding and Searching Memory**

This example demonstrates the basic flow using the `InMemoryMemoryService` for simplicity.

??? "Full Code"

    ```py
    import asyncio
    from google.adk.agents import LlmAgent
    from google.adk.sessions import InMemorySessionService, Session
    from google.adk.memory import InMemoryMemoryService # Import MemoryService
    from google.adk.runners import Runner
    from google.adk.tools import load_memory # Tool to query memory
    from google.genai.types import Content, Part

    # --- Constants ---
    APP_NAME = "memory_example_app"
    USER_ID = "mem_user"
    MODEL = "gemini-2.0-flash" # Use a valid model

    # --- Agent Definitions ---
    # Agent 1: Simple agent to capture information
    info_capture_agent = LlmAgent(
        model=MODEL,
        name="InfoCaptureAgent",
        instruction="Acknowledge the user's statement.",
        # output_key="captured_info" # Could optionally save to state too
    )

    # Agent 2: Agent that can use memory
    memory_recall_agent = LlmAgent(
        model=MODEL,
        name="MemoryRecallAgent",
        instruction="Answer the user's question. Use the 'load_memory' tool "
                    "if the answer might be in past conversations.",
        tools=[load_memory] # Give the agent the tool
    )

    # --- Services and Runner ---
    session_service = InMemorySessionService()
    memory_service = InMemoryMemoryService() # Use in-memory for demo

    runner = Runner(
        # Start with the info capture agent
        agent=info_capture_agent,
        app_name=APP_NAME,
        session_service=session_service,
        memory_service=memory_service # Provide the memory service to the Runner
    )

    # --- Scenario ---

    # Turn 1: Capture some information in a session
    print("--- Turn 1: Capturing Information ---")
    session1_id = "session_info"
    session1 = await runner.session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session1_id)
    user_input1 = Content(parts=[Part(text="My favorite project is Project Alpha.")], role="user")

    # Run the agent
    final_response_text = "(No final response)"
    async for event in runner.run_async(user_id=USER_ID, session_id=session1_id, new_message=user_input1):
        if event.is_final_response() and event.content and event.content.parts:
            final_response_text = event.content.parts[0].text
    print(f"Agent 1 Response: {final_response_text}")

    # Get the completed session
    completed_session1 = await runner.session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session1_id)

    # Add this session's content to the Memory Service
    print("\n--- Adding Session 1 to Memory ---")
    memory_service = await memory_service.add_session_to_memory(completed_session1)
    print("Session added to memory.")
    ```

## Vertex AI Memory Bank

The `VertexAiMemoryBankService` connects your agent to [Vertex AI Memory Bank](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/memory-bank/overview), a fully managed Google Cloud service that provides sophisticated, persistent memory capabilities for conversational agents.

### How It Works

The service automatically handles two key operations:

*   **Generating Memories:** At the end of a conversation, the ADK sends the session's events to the Memory Bank, which intelligently processes and stores the information as "memories."
*   **Retrieving Memories:** Your agent code can issue a search query against the Memory Bank to retrieve relevant memories from past conversations.

### Prerequisites

Before you can use this feature, you must have:

1.  **A Google Cloud Project:** With the Vertex AI API enabled.
2.  **An Agent Engine:** You need to create an Agent Engine in Vertex AI. This will provide you with the **Agent Engine ID** required for configuration.
3.  **Authentication:** Ensure your local environment is authenticated to access Google Cloud services. The simplest way is to run:
    ```bash
    gcloud auth application-default login
    ```
4.  **Environment Variables:** The service requires your Google Cloud Project ID and Location. Set them as environment variables:
    ```bash
    export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
    export GOOGLE_CLOUD_LOCATION="your-gcp-location"
    ```

### Configuration

To connect your agent to the Memory Bank, you use the `--memory_service_uri` flag when starting the ADK server (`adk web` or `adk api_server`). The URI must be in the format `agentengine://<agent_engine_id>`.

```bash title="bash"
adk web path/to/your/agents_dir --memory_service_uri="agentengine://1234567890"
```

Or, you can configure your agent to use the Memory Bank by manually instantiating the `VertexAiMemoryBankService` and passing it to the `Runner`.

```py
from google.adk.memory import VertexAiMemoryBankService

agent_engine_id = agent_engine.api_resource.name.split("/")[-1]

memory_service = VertexAiMemoryBankService(
    project="PROJECT_ID",
    location="LOCATION",
    agent_engine_id=agent_engine_id
)

runner = adk.Runner(
    ...
    memory_service=memory_service
)
``` 

### Using Memory in Your Agent

With the service configured, the ADK automatically saves session data to the Memory Bank. To make your agent use this memory, you need to call the `search_memory` method from your agent's code.

This is typically done at the beginning of a turn to fetch relevant context before generating a response.

**Example:**

```python
from google.adk.agents import Agent
from google.genai import types

class MyAgent(Agent):
    async def run(self, request: types.Content, **kwargs) -> types.Content:
        # Get the user's latest message
        user_query = request.parts[0].text

        # Search the memory for context related to the user's query
        search_result = await self.search_memory(query=user_query)

        # Create a prompt that includes the retrieved memories
        prompt = f"Based on my memory, here's what I recall about your query: {search_result.memories}\n\nNow, please respond to: {user_query}"

        # Call the LLM with the enhanced prompt
        return await self.llm.generate_content_async(prompt)
```

## Advanced Concepts

### How Memory Works in Practice

The memory workflow internally involves these steps:

1. **Session Interaction:** A user interacts with an agent via a `Session`, managed by a `SessionService`. Events are added, and state might be updated.  
2. **Ingestion into Memory:** At some point (often when a session is considered complete or has yielded significant information), your application calls `memory_service.add_session_to_memory(session)`. This extracts relevant information from the session's events and adds it to the long-term knowledge store (in-memory dictionary or RAG Corpus).  
3. **Later Query:** In a *different* (or the same) session, the user might ask a question requiring past context (e.g., "What did we discuss about project X last week?").  
4. **Agent Uses Memory Tool:** An agent equipped with a memory-retrieval tool (like the built-in `load_memory` tool) recognizes the need for past context. It calls the tool, providing a search query (e.g., "discussion project X last week").  
5. **Search Execution:** The tool internally calls `memory_service.search_memory(app_name, user_id, query)`.  
6. **Results Returned:** The `MemoryService` searches its store (using keyword matching or semantic search) and returns relevant snippets as a `SearchMemoryResponse` containing a list of `MemoryResult` objects (each potentially holding events from a relevant past session).  
7. **Agent Uses Results:** The tool returns these results to the agent, usually as part of the context or function response. The agent can then use this retrieved information to formulate its final answer to the user.

### Can an agent have access to more than one memory service?

*   **Through Standard Configuration: No.** The framework (`adk web`, `adk api_server`) is designed to be configured with one single memory service at a time via the `--memory_service_uri` flag. This single service is then provided to the agent and accessed through the built-in `self.search_memory()` method. From a configuration standpoint, you can only choose one backend (`InMemory`, `VertexAiMemoryBankService`) for all agents served by that process.

*   **Within Your Agent's Code: Yes, absolutely.** There is nothing preventing you from manually importing and instantiating another memory service directly inside your agent's code. This allows you to access multiple memory sources within a single agent turn.

For example, your agent could use the framework-configured `VertexAiMemoryBankService` to recall conversational history, and also manually instantiate a `InMemoryMemoryService` to look up information in a technical manual.

#### Example: Using Two Memory Services

Here’s how you could implement that in your agent's code:

```python
from google.adk.agents import Agent
from google.adk.memory import InMemoryMemoryService, VertexAiMemoryBankService
from google.genai import types

class MultiMemoryAgent(Agent):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.memory_service = InMemoryMemoryService()
        # Manually instantiate a second memory service for document lookups
        self.vertexai_memorybank_service = VertexAiMemoryBankService(
            project="PROJECT_ID",
            location="LOCATION",
            agent_engine_id="AGENT_ENGINE_ID"
        )

    async def run(self, request: types.Content, **kwargs) -> types.Content:
        user_query = request.parts[0].text

        # 1. Search conversational history using the framework-provided memory
        #    (This would be InMemoryMemoryService if configured)
        conversation_context = await self.search_memory(query=user_query)

        # 2. Search the document knowledge base using the manually created service
        document_context = await self.vertexai_memorybank_service.search_memory(query=user_query)

        # Combine the context from both sources to generate a better response
        prompt = "From our past conversations, I remember:\n"
        prompt += f"{conversation_context.memories}\n\n"
        prompt += "From the technical manuals, I found:\n"
        prompt += f"{document_context.memories}\n\n"
        prompt += f"Based on all this, here is my answer to '{user_query}':"

        return await self.llm.generate_content_async(prompt)
```



================================================
FILE: docs/sessions/session.md
================================================
# Session: Tracking Individual Conversations

Following our Introduction, let's dive into the `Session`. Think back to the
idea of a "conversation thread." Just like you wouldn't start every text message
from scratch, agents need context regarding the ongoing interaction.
**`Session`** is the ADK object designed specifically to track and manage these
individual conversation threads.

## The `Session` Object

When a user starts interacting with your agent, the `SessionService` creates a
`Session` object (`google.adk.sessions.Session`). This object acts as the
container holding everything related to that *one specific chat thread*. Here
are its key properties:

*   **Identification (`id`, `appName`, `userId`):** Unique labels for the
    conversation.
    * `id`: A unique identifier for *this specific* conversation thread, essential for retrieving it later. A SessionService object can handle multiple `Session`(s). This field identifies which particular session object are we referring to. For example, "test_id_modification".
    * `app_name`: Identifies which agent application this conversation belongs to. For example, "id_modifier_workflow". 
    *   `userId`: Links the conversation to a particular user.
*   **History (`events`):** A chronological sequence of all interactions
    (`Event` objects – user messages, agent responses, tool actions) that have
    occurred within this specific thread.
*   **Session State (`state`):** A place to store temporary data relevant *only*
    to this specific, ongoing conversation. This acts as a scratchpad for the
    agent during the interaction. We will cover how to use and manage `state` in
    detail in the next section.
*   **Activity Tracking (`lastUpdateTime`):** A timestamp indicating the last
    time an event occurred in this conversation thread.

### Example: Examining Session Properties


=== "Python"

       ```py
        from google.adk.sessions import InMemorySessionService, Session
    
        # Create a simple session to examine its properties
        temp_service = InMemorySessionService()
        example_session = await temp_service.create_session(
            app_name="my_app",
            user_id="example_user",
            state={"initial_key": "initial_value"} # State can be initialized
        )

        print(f"--- Examining Session Properties ---")
        print(f"ID (`id`):                {example_session.id}")
        print(f"Application Name (`app_name`): {example_session.app_name}")
        print(f"User ID (`user_id`):         {example_session.user_id}")
        print(f"State (`state`):           {example_session.state}") # Note: Only shows initial state here
        print(f"Events (`events`):         {example_session.events}") # Initially empty
        print(f"Last Update (`last_update_time`): {example_session.last_update_time:.2f}")
        print(f"---------------------------------")

        # Clean up (optional for this example)
        temp_service = await temp_service.delete_session(app_name=example_session.app_name,
                                    user_id=example_session.user_id, session_id=example_session.id)
        print("The final status of temp_service - ", temp_service)
       ```

=== "Java"

       ```java
        import com.google.adk.sessions.InMemorySessionService;
        import com.google.adk.sessions.Session;
        import java.util.concurrent.ConcurrentMap;
        import java.util.concurrent.ConcurrentHashMap;
    
        String sessionId = "123";
        String appName = "example-app"; // Example app name
        String userId = "example-user"; // Example user id
        ConcurrentMap<String, Object> initialState = new ConcurrentHashMap<>(Map.of("newKey", "newValue"));
        InMemorySessionService exampleSessionService = new InMemorySessionService();
    
        // Create Session
        Session exampleSession = exampleSessionService.createSession(
            appName, userId, initialState, Optional.of(sessionId)).blockingGet();
        System.out.println("Session created successfully.");
    
        System.out.println("--- Examining Session Properties ---");
        System.out.printf("ID (`id`): %s%n", exampleSession.id());
        System.out.printf("Application Name (`appName`): %s%n", exampleSession.appName());
        System.out.printf("User ID (`userId`): %s%n", exampleSession.userId());
        System.out.printf("State (`state`): %s%n", exampleSession.state());
        System.out.println("------------------------------------");
    
    
        // Clean up (optional for this example)
        var unused = exampleSessionService.deleteSession(appName, userId, sessionId);
       ```

*(**Note:** The state shown above is only the initial state. State updates
happen via events, as discussed in the State section.)*

## Managing Sessions with a `SessionService`

As seen above, you don't typically create or manage `Session` objects directly.
Instead, you use a **`SessionService`**. This service acts as the central
manager responsible for the entire lifecycle of your conversation sessions.

Its core responsibilities include:

*   **Starting New Conversations:** Creating fresh `Session` objects when a user
    begins an interaction.
*   **Resuming Existing Conversations:** Retrieving a specific `Session` (using
    its ID) so the agent can continue where it left off.
*   **Saving Progress:** Appending new interactions (`Event` objects) to a
    session's history. This is also the mechanism through which session `state`
    gets updated (more in the `State` section).
*   **Listing Conversations:** Finding the active session threads for a
    particular user and application.
*   **Cleaning Up:** Deleting `Session` objects and their associated data when
    conversations are finished or no longer needed.

## `SessionService` Implementations

ADK provides different `SessionService` implementations, allowing you to choose
the storage backend that best suits your needs:

1.  **`InMemorySessionService`**

    *   **How it works:** Stores all session data directly in the application's
        memory.
    *   **Persistence:** None. **All conversation data is lost if the
        application restarts.**
    *   **Requires:** Nothing extra.
    *   **Best for:** Quick development, local testing, examples, and scenarios
        where long-term persistence isn't required.

    === "Python"
    
           ```py
            from google.adk.sessions import InMemorySessionService
            session_service = InMemorySessionService()
           ```
    === "Java"
    
           ```java
            import com.google.adk.sessions.InMemorySessionService;
            InMemorySessionService exampleSessionService = new InMemorySessionService();
           ```

2.  **`VertexAiSessionService`**

    *   **How it works:** Uses Google Cloud's Vertex AI infrastructure via API
        calls for session management.
    *   **Persistence:** Yes. Data is managed reliably and scalably via
        [Vertex AI Agent Engine](https://google.github.io/adk-docs/deploy/agent-engine/).
    *   **Requires:**
        *   A Google Cloud project (`pip install vertexai`)
        *   A Google Cloud storage bucket that can be configured by this
            [step](https://cloud.google.com/vertex-ai/docs/pipelines/configure-project#storage).
        *   A Reasoning Engine resource name/ID that can setup following this
            [tutorial](https://google.github.io/adk-docs/deploy/agent-engine/).
        *   If you do not have a Google Cloud project and you want to try the VertexAiSessionService for free, see how to [try Session and Memory for free.](express-mode.md)
    *   **Best for:** Scalable production applications deployed on Google Cloud,
        especially when integrating with other Vertex AI features.

    === "Python"
    
           ```py
           # Requires: pip install google-adk[vertexai]
           # Plus GCP setup and authentication
           from google.adk.sessions import VertexAiSessionService

           PROJECT_ID = "your-gcp-project-id"
           LOCATION = "us-central1"
           # The app_name used with this service should be the Reasoning Engine ID or name
           REASONING_ENGINE_APP_NAME = "projects/your-gcp-project-id/locations/us-central1/reasoningEngines/your-engine-id"

           session_service = VertexAiSessionService(project=PROJECT_ID, location=LOCATION)
           # Use REASONING_ENGINE_APP_NAME when calling service methods, e.g.:
           # session_service = await session_service.create_session(app_name=REASONING_ENGINE_APP_NAME, ...)
           ```
       
    === "Java"
    
           ```java
           // Please look at the set of requirements above, consequently export the following in your bashrc file:
           // export GOOGLE_CLOUD_PROJECT=my_gcp_project
           // export GOOGLE_CLOUD_LOCATION=us-central1
           // export GOOGLE_API_KEY=my_api_key

           import com.google.adk.sessions.VertexAiSessionService;
           import java.util.UUID;

           String sessionId = UUID.randomUUID().toString();
           String reasoningEngineAppName = "123456789";
           String userId = "u_123"; // Example user id
           ConcurrentMap<String, Object> initialState = new
               ConcurrentHashMap<>(); // No initial state needed for this example

           VertexAiSessionService sessionService = new VertexAiSessionService();
           Session mySession =
               sessionService
                   .createSession(reasoningEngineAppName, userId, initialState, Optional.of(sessionId))
                   .blockingGet();
           ```

3.  **`DatabaseSessionService`**

    ![python_only](https://img.shields.io/badge/Currently_supported_in-Python-blue){ title="This feature is currently available for Python. Java support is planned/ coming soon."}

    *   **How it works:** Connects to a relational database (e.g., PostgreSQL,
        MySQL, SQLite) to store session data persistently in tables.
    *   **Persistence:** Yes. Data survives application restarts.
    *   **Requires:** A configured database.
    *   **Best for:** Applications needing reliable, persistent storage that you
        manage yourself.

    ```py
    from google.adk.sessions import DatabaseSessionService
    # Example using a local SQLite file:
    db_url = "sqlite:///./my_agent_data.db"
    session_service = DatabaseSessionService(db_url=db_url)
    ```

Choosing the right `SessionService` is key to defining how your agent's
conversation history and temporary data are stored and persist.

## The Session Lifecycle

<img src="../../assets/session_lifecycle.png" alt="Session lifecycle">

Here’s a simplified flow of how `Session` and `SessionService` work together
during a conversation turn:

1.  **Start or Resume:** Your application's `Runner` uses the `SessionService`
    to either `create_session` (for a new chat) or `get_session` (to retrieve an
    existing one).
2.  **Context Provided:** The `Runner` gets the appropriate `Session` object
    from the appropriate service method, providing the agent with access to the
    corresponding Session's `state` and `events`.
3.  **Agent Processing:** The user prompts the agent with a query. The agent
    analyzes the query and potentially the session `state` and `events` history
    to determine the response.
4.  **Response & State Update:** The agent generates a response (and potentially
    flags data to be updated in the `state`). The `Runner` packages this as an
    `Event`.
5.  **Save Interaction:** The `Runner` calls
    `sessionService.append_event(session, event)` with the `session` and the new
    `event` as the arguments. The service adds the `Event` to the history and
    updates the session's `state` in storage based on information within the
    event. The session's `last_update_time` also get updated.
6.  **Ready for Next:** The agent's response goes to the user. The updated
    `Session` is now stored by the `SessionService`, ready for the next turn
    (which restarts the cycle at step 1, usually with the continuation of the
    conversation in the current session).
7.  **End Conversation:** When the conversation is over, your application calls
    `sessionService.delete_session(...)` to clean up the stored session data if
    it is no longer required.

This cycle highlights how the `SessionService` ensures conversational continuity
by managing the history and state associated with each `Session` object.



================================================
FILE: docs/sessions/state.md
================================================
# State: The Session's Scratchpad

Within each `Session` (our conversation thread), the **`state`** attribute acts like the agent's dedicated scratchpad for that specific interaction. While `session.events` holds the full history, `session.state` is where the agent stores and updates dynamic details needed *during* the conversation.

## What is `session.state`?

Conceptually, `session.state` is a collection (dictionary or Map) holding key-value pairs. It's designed for information the agent needs to recall or track to make the current conversation effective:

* **Personalize Interaction:** Remember user preferences mentioned earlier (e.g., `'user_preference_theme': 'dark'`).
* **Track Task Progress:** Keep tabs on steps in a multi-turn process (e.g., `'booking_step': 'confirm_payment'`).
* **Accumulate Information:** Build lists or summaries (e.g., `'shopping_cart_items': ['book', 'pen']`).
* **Make Informed Decisions:** Store flags or values influencing the next response (e.g., `'user_is_authenticated': True`).

### Key Characteristics of `State`

1. **Structure: Serializable Key-Value Pairs**

    * Data is stored as `key: value`.
    * **Keys:** Always strings (`str`). Use clear names (e.g., `'departure_city'`, `'user:language_preference'`).
    * **Values:** Must be **serializable**. This means they can be easily saved and loaded by the `SessionService`. Stick to basic types in the specific languages (Python/ Java) like strings, numbers, booleans, and simple lists or dictionaries containing *only* these basic types. (See API documentation for precise details).
    * **⚠️ Avoid Complex Objects:** **Do not store non-serializable objects** (custom class instances, functions, connections, etc.) directly in the state. Store simple identifiers if needed, and retrieve the complex object elsewhere.

2. **Mutability: It Changes**

    * The contents of the `state` are expected to change as the conversation evolves.

3. **Persistence: Depends on `SessionService`**

    * Whether state survives application restarts depends on your chosen service:
      * `InMemorySessionService`: **Not Persistent.** State is lost on restart.
      * `DatabaseSessionService` / `VertexAiSessionService`: **Persistent.** State is saved reliably.

!!! Note
    The specific parameters or method names for the primitives may vary slightly by SDK language (e.g., `session.state['current_intent'] = 'book_flight'` in Python, `session.state().put("current_intent", "book_flight)` in Java). Refer to the language-specific API documentation for details.

### Organizing State with Prefixes: Scope Matters

Prefixes on state keys define their scope and persistence behavior, especially with persistent services:

* **No Prefix (Session State):**

    * **Scope:** Specific to the *current* session (`id`).
    * **Persistence:** Only persists if the `SessionService` is persistent (`Database`, `VertexAI`).
    * **Use Cases:** Tracking progress within the current task (e.g., `'current_booking_step'`), temporary flags for this interaction (e.g., `'needs_clarification'`).
    * **Example:** `session.state['current_intent'] = 'book_flight'`

* **`user:` Prefix (User State):**

    * **Scope:** Tied to the `user_id`, shared across *all* sessions for that user (within the same `app_name`).
    * **Persistence:** Persistent with `Database` or `VertexAI`. (Stored by `InMemory` but lost on restart).
    * **Use Cases:** User preferences (e.g., `'user:theme'`), profile details (e.g., `'user:name'`).
    * **Example:** `session.state['user:preferred_language'] = 'fr'`

* **`app:` Prefix (App State):**

    * **Scope:** Tied to the `app_name`, shared across *all* users and sessions for that application.
    * **Persistence:** Persistent with `Database` or `VertexAI`. (Stored by `InMemory` but lost on restart).
    * **Use Cases:** Global settings (e.g., `'app:api_endpoint'`), shared templates.
    * **Example:** `session.state['app:global_discount_code'] = 'SAVE10'`

* **`temp:` Prefix (Temporary Session State):**

    * **Scope:** Specific to the *current* session processing turn.
    * **Persistence:** **Never Persistent.** Guaranteed to be discarded, even with persistent services.
    * **Use Cases:** Intermediate results needed only immediately, data you explicitly don't want stored.
    * **Example:** `session.state['temp:raw_api_response'] = {...}`

**How the Agent Sees It:** Your agent code interacts with the *combined* state through the single `session.state` collection (dict/ Map). The `SessionService` handles fetching/merging state from the correct underlying storage based on prefixes.

### Accessing Session State in Agent Instructions

When working with `LlmAgent` instances, you can directly inject session state values into the agent's instruction string using a simple templating syntax. This allows you to create dynamic and context-aware instructions without relying solely on natural language directives.

#### Using `{key}` Templating

To inject a value from the session state, enclose the key of the desired state variable within curly braces: `{key}`. The framework will automatically replace this placeholder with the corresponding value from `session.state` before passing the instruction to the LLM.

**Example:**

```python
from google.adk.agents import LlmAgent

story_generator = LlmAgent(
    name="StoryGenerator",
    model="gemini-2.0-flash",
    instruction="""Write a short story about a cat, focusing on the theme: {topic}."""
)

# Assuming session.state['topic'] is set to "friendship", the LLM 
# will receive the following instruction:
# "Write a short story about a cat, focusing on the theme: friendship."
```

#### Important Considerations

* Key Existence: Ensure that the key you reference in the instruction string exists in the session.state. If the key is missing, the agent might misbehave or throw an error.
* Data Types: The value associated with the key should be a string or a type that can be easily converted to a string.
* Escaping: If you need to use literal curly braces in your instruction (e.g., for JSON formatting), you'll need to escape them.

#### Bypassing State Injection with `InstructionProvider`

In some cases, you might want to use `{{` and `}}` literally in your instructions without triggering the state injection mechanism. For example, you might be writing instructions for an agent that helps with a templating language that uses the same syntax.

To achieve this, you can provide a function to the `instruction` parameter instead of a string. This function is called an `InstructionProvider`. When you use an `InstructionProvider`, the ADK will not attempt to inject state, and your instruction string will be passed to the model as-is.

The `InstructionProvider` function receives a `ReadonlyContext` object, which you can use to access session state or other contextual information if you need to build the instruction dynamically.

=== "Python"

    ```python
    from google.adk.agents import LlmAgent
    from google.adk.agents.readonly_context import ReadonlyContext

    # This is an InstructionProvider
    def my_instruction_provider(context: ReadonlyContext) -> str:
        # You can optionally use the context to build the instruction
        # For this example, we'll return a static string with literal braces.
        return "This is an instruction with {{literal_braces}} that will not be replaced."

    agent = LlmAgent(
        model="gemini-2.0-flash",
        name="template_helper_agent",
        instruction=my_instruction_provider
    )
    ```

If you want to both use an `InstructionProvider` *and* inject state into your instructions, you can use the `inject_session_state` utility function.

=== "Python"

    ```python
    from google.adk.agents import LlmAgent
    from google.adk.agents.readonly_context import ReadonlyContext
    from google.adk.utils import instructions_utils

    async def my_dynamic_instruction_provider(context: ReadonlyContext) -> str:
        template = "This is a {adjective} instruction with {{literal_braces}}."
        # This will inject the 'adjective' state variable but leave the literal braces.
        return await instructions_utils.inject_session_state(template, context)

    agent = LlmAgent(
        model="gemini-2.0-flash",
        name="dynamic_template_helper_agent",
        instruction=my_dynamic_instruction_provider
    )
    ```

**Benefits of Direct Injection**

* Clarity: Makes it explicit which parts of the instruction are dynamic and based on session state.
* Reliability: Avoids relying on the LLM to correctly interpret natural language instructions to access state.
* Maintainability: Simplifies instruction strings and reduces the risk of errors when updating state variable names.

**Relation to Other State Access Methods**

This direct injection method is specific to LlmAgent instructions. Refer to the following section for more information on other state access methods.

### How State is Updated: Recommended Methods

!!! note "The Right Way to Modify State"
    When you need to change the session state, the correct and safest method is to **directly modify the `state` object on the `Context`** provided to your function (e.g., `callback_context.state['my_key'] = 'new_value'`). This is considered "direct state manipulation" in the right way, as the framework automatically tracks these changes.

    This is critically different from directly modifying the `state` on a `Session` object you retrieve from the `SessionService` (e.g., `my_session.state['my_key'] = 'new_value'`). **You should avoid this**, as it bypasses the ADK's event tracking and can lead to lost data. The "Warning" section at the end of this page has more details on this important distinction.

State should **always** be updated as part of adding an `Event` to the session history using `session_service.append_event()`. This ensures changes are tracked, persistence works correctly, and updates are thread-safe.

**1\. The Easy Way: `output_key` (for Agent Text Responses)**

This is the simplest method for saving an agent's final text response directly into the state. When defining your `LlmAgent`, specify the `output_key`:

=== "Python"

    ```py
    from google.adk.agents import LlmAgent
    from google.adk.sessions import InMemorySessionService, Session
    from google.adk.runners import Runner
    from google.genai.types import Content, Part

    # Define agent with output_key
    greeting_agent = LlmAgent(
        name="Greeter",
        model="gemini-2.0-flash", # Use a valid model
        instruction="Generate a short, friendly greeting.",
        output_key="last_greeting" # Save response to state['last_greeting']
    )

    # --- Setup Runner and Session ---
    app_name, user_id, session_id = "state_app", "user1", "session1"
    session_service = InMemorySessionService()
    runner = Runner(
        agent=greeting_agent,
        app_name=app_name,
        session_service=session_service
    )
    session = await session_service.create_session(app_name=app_name,
                                        user_id=user_id,
                                        session_id=session_id)
    print(f"Initial state: {session.state}")

    # --- Run the Agent ---
    # Runner handles calling append_event, which uses the output_key
    # to automatically create the state_delta.
    user_message = Content(parts=[Part(text="Hello")])
    for event in runner.run(user_id=user_id,
                            session_id=session_id,
                            new_message=user_message):
        if event.is_final_response():
          print(f"Agent responded.") # Response text is also in event.content

    # --- Check Updated State ---
    updated_session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    print(f"State after agent run: {updated_session.state}")
    # Expected output might include: {'last_greeting': 'Hello there! How can I help you today?'}
    ```

=== "Java"

    ```java
    --8<-- "examples/java/snippets/src/main/java/state/GreetingAgentExample.java:full_code"
    ```

Behind the scenes, the `Runner` uses the `output_key` to create the necessary `EventActions` with a `state_delta` and calls `append_event`.

**2\. The Standard Way: `EventActions.state_delta` (for Complex Updates)**

For more complex scenarios (updating multiple keys, non-string values, specific scopes like `user:` or `app:`, or updates not tied directly to the agent's final text), you manually construct the `state_delta` within `EventActions`.

=== "Python"

    ```py
    from google.adk.sessions import InMemorySessionService, Session
    from google.adk.events import Event, EventActions
    from google.genai.types import Part, Content
    import time

    # --- Setup ---
    session_service = InMemorySessionService()
    app_name, user_id, session_id = "state_app_manual", "user2", "session2"
    session = await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
        state={"user:login_count": 0, "task_status": "idle"}
    )
    print(f"Initial state: {session.state}")

    # --- Define State Changes ---
    current_time = time.time()
    state_changes = {
        "task_status": "active",              # Update session state
        "user:login_count": session.state.get("user:login_count", 0) + 1, # Update user state
        "user:last_login_ts": current_time,   # Add user state
        "temp:validation_needed": True        # Add temporary state (will be discarded)
    }

    # --- Create Event with Actions ---
    actions_with_update = EventActions(state_delta=state_changes)
    # This event might represent an internal system action, not just an agent response
    system_event = Event(
        invocation_id="inv_login_update",
        author="system", # Or 'agent', 'tool' etc.
        actions=actions_with_update,
        timestamp=current_time
        # content might be None or represent the action taken
    )

    # --- Append the Event (This updates the state) ---
    await session_service.append_event(session, system_event)
    print("`append_event` called with explicit state delta.")

    # --- Check Updated State ---
    updated_session = await session_service.get_session(app_name=app_name,
                                                user_id=user_id,
                                                session_id=session_id)
    print(f"State after event: {updated_session.state}")
    # Expected: {'user:login_count': 1, 'task_status': 'active', 'user:last_login_ts': <timestamp>}
    # Note: 'temp:validation_needed' is NOT present.
    ```

=== "Java"

    ```java
    --8<-- "examples/java/snippets/src/main/java/state/ManualStateUpdateExample.java:full_code"
    ```

**3. Via `CallbackContext` or `ToolContext` (Recommended for Callbacks and Tools)**

Modifying state within agent callbacks (e.g., `on_before_agent_call`, `on_after_agent_call`) or tool functions is best done using the `state` attribute of the `CallbackContext` or `ToolContext` provided to your function.

*   `callback_context.state['my_key'] = my_value`
*   `tool_context.state['my_key'] = my_value`

These context objects are specifically designed to manage state changes within their respective execution scopes. When you modify `context.state`, the ADK framework ensures that these changes are automatically captured and correctly routed into the `EventActions.state_delta` for the event being generated by the callback or tool. This delta is then processed by the `SessionService` when the event is appended, ensuring proper persistence and tracking.

This method abstracts away the manual creation of `EventActions` and `state_delta` for most common state update scenarios within callbacks and tools, making your code cleaner and less error-prone.

For more comprehensive details on context objects, refer to the [Context documentation](../context/index.md).

=== "Python"

    ```python
    # In an agent callback or tool function
    from google.adk.agents import CallbackContext # or ToolContext

    def my_callback_or_tool_function(context: CallbackContext, # Or ToolContext
                                     # ... other parameters ...
                                    ):
        # Update existing state
        count = context.state.get("user_action_count", 0)
        context.state["user_action_count"] = count + 1

        # Add new state
        context.state["temp:last_operation_status"] = "success"

        # State changes are automatically part of the event's state_delta
        # ... rest of callback/tool logic ...
    ```

=== "Java"

    ```java
    // In an agent callback or tool method
    import com.google.adk.agents.CallbackContext; // or ToolContext
    // ... other imports ...

    public class MyAgentCallbacks {
        public void onAfterAgent(CallbackContext callbackContext) {
            // Update existing state
            Integer count = (Integer) callbackContext.state().getOrDefault("user_action_count", 0);
            callbackContext.state().put("user_action_count", count + 1);

            // Add new state
            callbackContext.state().put("temp:last_operation_status", "success");

            // State changes are automatically part of the event's state_delta
            // ... rest of callback logic ...
        }
    }
    ```

**What `append_event` Does:**

* Adds the `Event` to `session.events`.
* Reads the `state_delta` from the event's `actions`.
* Applies these changes to the state managed by the `SessionService`, correctly handling prefixes and persistence based on the service type.
* Updates the session's `last_update_time`.
* Ensures thread-safety for concurrent updates.

### ⚠️ A Warning About Direct State Modification

Avoid directly modifying the `session.state` collection (dictionary/Map) on a `Session` object that was obtained directly from the `SessionService` (e.g., via `session_service.get_session()` or `session_service.create_session()`) *outside* of the managed lifecycle of an agent invocation (i.e., not through a `CallbackContext` or `ToolContext`). For example, code like `retrieved_session = await session_service.get_session(...); retrieved_session.state['key'] = value` is problematic.

State modifications *within* callbacks or tools using `CallbackContext.state` or `ToolContext.state` are the correct way to ensure changes are tracked, as these context objects handle the necessary integration with the event system.

**Why direct modification (outside of contexts) is strongly discouraged:**

1. **Bypasses Event History:** The change isn't recorded as an `Event`, losing auditability.
2. **Breaks Persistence:** Changes made this way **will likely NOT be saved** by `DatabaseSessionService` or `VertexAiSessionService`. They rely on `append_event` to trigger saving.
3. **Not Thread-Safe:** Can lead to race conditions and lost updates.
4. **Ignores Timestamps/Logic:** Doesn't update `last_update_time` or trigger related event logic.

**Recommendation:** Stick to updating state via `output_key`, `EventActions.state_delta` (when manually creating events), or by modifying the `state` property of `CallbackContext` or `ToolContext` objects when within their respective scopes. These methods ensure reliable, trackable, and persistent state management. Use direct access to `session.state` (from a `SessionService`-retrieved session) only for *reading* state.

### Best Practices for State Design Recap

* **Minimalism:** Store only essential, dynamic data.
* **Serialization:** Use basic, serializable types.
* **Descriptive Keys & Prefixes:** Use clear names and appropriate prefixes (`user:`, `app:`, `temp:`, or none).
* **Shallow Structures:** Avoid deep nesting where possible.
* **Standard Update Flow:** Rely on `append_event`.


