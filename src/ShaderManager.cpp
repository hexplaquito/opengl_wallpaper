#include "ShaderManager.hpp"
#include <filesystem>
#include <GLFW/glfw3.h>

ShaderManager::ShaderManager() {
  namespace fs = std::filesystem;

  fs::path folder = "../shaders";

  std::vector<std::string> shader_names;

  for (const auto& entry : fs::directory_iterator(folder))
  {
    if (entry.is_regular_file())
    {
      if (entry.path().extension() == ".toml") {
        shader_names.push_back(entry.path().string());
      }
    }
  }

  for (const auto& name: shader_names) {
    std::cout << name << std::endl;

    // if (name == "../shaders\\fragment.frag") {
    //   continue;
    // }
    // m_shaders.push_back(new Shader("../shaders/vertex.vert", name.c_str()));

    LoadShader(name);
  }

  m_currentShaderIndex = 0; // init var at 0
  UseShader(GetCurrent());
  // Reload();
}

// unload
ShaderManager::~ShaderManager() {
  for (auto shader : m_shaderVec) {
    delete shader;
  }

  m_shaderVec.clear();
  m_shaderMap.clear();
}

Shader *ShaderManager::GetCurrent() {
  return m_shaderVec.at(m_currentShaderIndex);
}

void ShaderManager::UseNext() {

  if (m_shaderVec.empty()) {
    return;
  }

  m_currentShaderIndex =
        (m_currentShaderIndex + 1) % m_shaderVec.size();

  UseShader(GetCurrent());

}
void ShaderManager::UsePrevious() {

  if (m_shaderVec.empty()) {
    return;
  }

  m_currentShaderIndex =
        (m_currentShaderIndex - 1) % m_shaderVec.size();

  UseShader(GetCurrent());
}

// reload only fragment.frag
void ShaderManager::Reload() {
  LoadShader("../shaders/default.metadata.toml");
  m_currentShaderIndex = 0; // reset to 0
  UseShader(GetCurrent());
}

void ShaderManager::UseShader(Shader *shader) {
  shader->use();
  GLFWmonitor* monitor = glfwGetPrimaryMonitor();
  const GLFWvidmode* mode = glfwGetVideoMode(monitor);
  shader->setVec2("iResolution", mode->width, mode->height);
}

#include "toml.hpp"

void ShaderManager::LoadShader(std::string file) {

  toml::table tbl;
  try
  {
    tbl = toml::parse_file(file);

    auto shaderName = tbl["name"].value<std::string>();

    auto vertShaderPath = tbl["vertex"].value<std::string>();
    auto fragShaderPath = tbl["fragment"].value<std::string>();

    std::cout << vertShaderPath->c_str() << " " << fragShaderPath->c_str() << "\n";

    Channel iChannel0 = static_cast<Channel>(tbl["iChannel0"].value<int>().value());
    Channel iChannel1 = static_cast<Channel>(tbl["iChannel1"].value<int>().value());
    Channel iChannel2 = static_cast<Channel>(tbl["iChannel2"].value<int>().value());

    auto bufferA = tbl["bufferA"].value<std::string>();
    auto bufferB = tbl["bufferB"].value<std::string>();
    auto bufferC = tbl["bufferC"].value<std::string>();

    auto shader = new Shader(vertShaderPath->c_str(), fragShaderPath->c_str(),
      iChannel0, iChannel1, iChannel2,
      bufferA.value(), bufferB.value(), bufferC.value());

    auto it = m_shaderMap.find(shaderName.value());

    if (it != m_shaderMap.end()) {
      Shader* oldShader = it->second;

      std::erase(m_shaderVec, oldShader);
      m_shaderMap.erase(it);

      delete oldShader;
    }

    m_shaderMap.emplace(shaderName.value(), shader);
    m_shaderVec.emplace_back(shader);

    std::cout << "Loaded shader " << shaderName.value() << std::endl;
  }
  catch (const toml::parse_error& err)
  {
    std::cerr << "Parsing failed:\n" << err << "\n";
    return;
  }
}