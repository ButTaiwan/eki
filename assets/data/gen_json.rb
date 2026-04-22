systems = []
#routes = {}
stations = {}

require 'json'

f = File.open("stations_20260422.tsv", "r:utf-8")
now_sys = nil
now_route = nil
now_color = nil
f.each { |s|
  #s.chomp!
  next if s == ''
  next if s[0] == '#'

  id, color, no, cname, ename, jname, kana, kname, s_cname, s_ename, area, p_id, p_dis, n_id, n_dis = s.split("\t")
  next if id == 'id'
  next if id == nil || id == ''

  if id == 'sys'
    raise "Invalid system name: #{cname}" if cname == nil || cname == ''
    
    now_sys = {cname: cname, ename: ename, jname: jname, routes: [], stations: {}}
    systems << now_sys

  elsif id == 'route'
    raise "Must define route color: #{color}" if color == nil || color == ''

    now_route = {cname: cname, ename: ename, jname: jname, list: []}
    now_sys[:routes] << now_route
    now_color = color.chomp.gsub(/^#/, '').upcase

  elsif color != nil && color != '' && id != 'route'
    raise "Color defined for station: #{id} #{cname} #{color}"

  elsif now_route
    st = {
      #id: id, 
      cname: cname, ename: ename, jname: jname, kana: kana, kname: kname,
      s_cname: s_cname, s_ename: s_ename,
      p_id: p_id, p_dis: p_dis, n_id: n_id, n_dis: n_dis,
      no: no, area: area, rgb: now_color
    }
    # 警告重複的ID
    warn "Duplicate station ID: #{id} #{cname} / #{stations[id][:cname]}" if stations[id]

    stations[id] = st
    now_route[:list] << id
    now_sys[:stations][id] = st
  else
    warn "Orphan station: #{id} #{cname}"
  end
}
f.close

# 檢查不存在的ID
systems.each { |sys|
  sys[:stations].each { |id, st|
    if st[:p_id] != '' && !stations[st[:p_id]]
      warn "Previous station ID not found: #{id} #{st[:cname]} -> #{st[:p_id]}"
    elsif st[:n_id] != '' && !stations[st[:n_id]]
      warn "Next station ID not found: #{id} #{st[:cname]} -> #{st[:n_id]}"
    end
  }
}

File.open("stations.json", "w:utf-8") do |f|
  #f.write(JSON.pretty_generate(systems))
  f.write(JSON.generate(systems))
end