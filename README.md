healthyweb

This is free and open source web based Hospital Information System with inbuilt clinical decision support system and data analysis capabilities.

Requires:
gambas3 (https://gambas.sourceforge.net)

\
\
Edit `MMain` module 

\
<<<<<<< HEAD
Startup Class : FmLogIn
=======
Startup Class : FmLogIn \
>>>>>>> 89fbf25ca6210f92b6da8c6e4c5308dbfef49096
`Public $SISHAppMode As String = "HIS"`  for EMR \
`Public $SISHAppMode As String = "REP"`  for Data Centre Front end \
`Public $SISHAppMode As String = "HMIS"`  for HMIS Registers \
`Public $SISHAppMode As String = "Registry"`  for Clinical Registry \
<<<<<<< HEAD
`Public $SISHAppMode As String = "TeleMed"`  for Telemedicine Hub Page \

\
Startup Class : fmPatLogin \
`Public $SISHAppMode As String = "Portal"`  for Patient Portal \

\
Startup Class : fmHospDash \
`Public $SISHAppMode As String = "Dashboard"`  for Public Dashboard \
=======
`Public $SISHAppMode As String = "TeleMed"`  for Telemedicine Hub Page 

\
Startup Class : fmPatLogin \
`Public $SISHAppMode As String = "Portal"`  for Patient Portal 

\
Startup Class : fmHospDash \
`Public $SISHAppMode As String = "Dashboard"`  for Public Dashboard 
>>>>>>> 89fbf25ca6210f92b6da8c6e4c5308dbfef49096

